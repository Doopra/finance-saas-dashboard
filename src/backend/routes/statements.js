const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Polyfill browser DOM objects for pdf-parse in Node.js/Next.js edge
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === 'undefined') {
  global.ImageData = class ImageData {};
}
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D {};
}

let pdfParseFunc = null;
// Lazy‑load pdf‑parse and cache the parser function
const getPdfParseFunc = async () => {
  if (pdfParseFunc) return pdfParseFunc;
  const mod = await import('pdf-parse');
  pdfParseFunc = mod.PDFParse || (mod.default && mod.default.PDFParse) || mod.default || mod;
  return pdfParseFunc;
};
const xlsx = require('xlsx');
const Tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for large files
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.csv', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only PDF, CSV, Excel, or Images are allowed.'));
    }
  }
});

// DELETE endpoint to remove a statement and its related transactions
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  const statementId = req.params.id;
  try {
    // Delete related transactions first to maintain foreign key constraints
    await db.run('DELETE FROM transactions WHERE statement_id = ?', [statementId]);
    // Delete the statement record
    await db.run('DELETE FROM statements WHERE id = ? AND user_id = ?', [statementId, req.userId]);
    res.json({ message: `Statement ${statementId} and its transactions have been deleted.` });
  } catch (err) {
    console.error('Delete statement error:', err);
    res.status(500).json({ error: 'Failed to delete statement.' });
  }
});

// Helper: Rule-based transaction categorizer
const categorizeTransaction = async (userId, description, amount, type) => {
  const cleanDesc = description.toLowerCase();
  
  // 1. Check custom user rules in database
  const rules = await db.query('SELECT pattern, category FROM category_rules WHERE user_id = ?', [userId]);
  for (const rule of rules) {
    if (cleanDesc.includes(rule.pattern.toLowerCase())) {
      return rule.category;
    }
  }

  // 2. High-value Credit rule (Sales Income)
  if (type === 'credit' && (amount >= 100000 || cleanDesc.includes('sales') || cleanDesc.includes('revenue') || cleanDesc.includes('deposit'))) {
    return 'Sales Income';
  }

  // 3. Fallback Product Purchase keywords
  if (cleanDesc.includes('product') || cleanDesc.includes('supplier') || cleanDesc.includes('wholesale') || 
      cleanDesc.includes('stock') || cleanDesc.includes('inventory') || cleanDesc.includes('purchase') || 
      cleanDesc.includes('ltd') || cleanDesc.includes('mfg') || cleanDesc.includes('store') || cleanDesc.includes('distributor')) {
    return 'Product Purchases';
  }

  // 4. Default to Miscellaneous for everything else (or personal/transfers/charges)
  return 'Miscellaneous Expenses';
};

// Regex Fallback Parser for Text / OCR Outputs
const parseTextTransactions = (text) => {
  const lines = text.split('\n');
  const transactions = [];
  
  // Date patterns: DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YYYY, DD MMM YYYY, etc.
  const dateRegex = /\b(\d{1,2})[-/\s.,](\d{1,2}|\w{3,9})[-/\s.,](\d{2,4})\b|\b(\d{4})[-/\s.,](\d{1,2}|\w{3,9})[-/\s.,](\d{1,2})\b/;

  lines.forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.length < 10) return;

    const dateMatch = cleanLine.match(dateRegex);
    if (!dateMatch) return;

    const dateStr = dateMatch[0];
    
    // Attempt to isolate description and amounts
    // Remove date from the line
    let remaining = cleanLine.replace(dateStr, '').trim();
    
    // Find numeric values in the line (typically amount, balance)
    // We look for numbers with a decimal point to be confident it's an amount
    const numberRegex = /\b\d{1,3}(?:,\d{3})*(?:\.\d{2,})\b|\b\d+(?:\.\d{2,})\b/g;
    const numbers = remaining.match(numberRegex) || [];
    
    if (numbers.length === 0) return;
    
    // The first non-zero number is typically the transaction amount
    let amountVal = 0;
    for (const num of numbers) {
      const val = parseFloat(num.replace(/,/g, ''));
      if (val > 0) {
        amountVal = val;
        break;
      }
    }
    
    if (amountVal === 0) return;

    // Remove numbers and currency symbols from remaining string to get description
    let description = remaining;
    numbers.forEach(num => {
      description = description.replace(num, '');
    });
    
    description = description
      .replace(/[₦$€£\-\+\*]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (description.length < 3) {
      description = 'Transaction Info';
    }

    // Determine credit or debit
    const lowerLine = cleanLine.toLowerCase();
    const isCredit = lowerLine.includes('cr') || 
                     lowerLine.includes('credit') || 
                     lowerLine.includes('inflow') ||
                     lowerLine.includes('deposit') ||
                     cleanLine.includes('+');

    const type = isCredit ? 'credit' : 'debit';
    
    transactions.push({
      date: formatParsedDate(dateStr),
      description,
      amount: amountVal,
      type
    });
  });

  return transactions;
};

// Utility to normalize date strings (handles Excel serial numbers, ISO strings, DD/MM/YYYY etc.)
const formatParsedDate = (dateStr) => {
  try {
    // Handle Excel serial number dates (returned by xlsx for date cells)
    const asNum = Number(dateStr);
    if (!isNaN(asNum) && asNum > 1000 && asNum < 100000) {
      // Excel date serial: days since 1900-01-01 (with the 1900 leap year bug offset)
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + asNum * 86400000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    const s = String(dateStr).trim();

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const clean = s.replace(/[-/.,]/g, ' ');
    const parts = clean.trim().split(/\s+/);
    if (parts.length === 3) {
      // YYYY MM DD
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // DD MM YYYY or DD MMM YYYY
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const month = isNaN(parts[1]) ? getMonthNumber(parts[1]) : parts[1];
      return `${year}-${month.toString().padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  } catch (e) {}
  return new Date().toISOString().split('T')[0]; // fallback to today
};

const getMonthNumber = (monthStr) => {
  const months = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  return months[monthStr.toLowerCase().substring(0, 3)] || 1;
};

// POST Upload Statement
router.post('/upload', authMiddleware, upload.single('statement'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { path: filePath, originalname: filename, mimetype } = req.file;
  const ext = path.extname(filename).toLowerCase();
  const userGeminiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

  let fileType = 'excel';
  if (ext === '.pdf') fileType = 'pdf';
  else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) fileType = 'image';

  try {
    // Create Statement record
    const statementResult = await db.run(
      'INSERT INTO statements (user_id, filename, file_type, status) VALUES (?, ?, ?, ?)',
      [req.userId, filename, fileType, 'processing']
    );
    const statementId = statementResult.id;

    let rawText = '';
    let extractedTransactions = [];

    // --- 1. SPREADSHEET EXTRACTION (CSV / EXCEL) ---
    if (fileType === 'excel') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length > 0) {
        // Look for columns: Date, Description, Amount, etc.
        const headers = data[0].map(h => String(h).toLowerCase().trim());
        const dateIdx = headers.findIndex(h => h.includes('date'));
        const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('detail') || h.includes('narrat'));
        const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('value'));
        const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('outflow') || h.includes('withdrawal'));
        const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('inflow') || h.includes('deposit'));

        // Skip headers, process rows
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          let rawDate = row[dateIdx !== -1 ? dateIdx : 0];
          let rawDesc = row[descIdx !== -1 ? descIdx : 1] || 'Transaction';
          let rawAmount = 0;
          let type = 'debit';

          if (amtIdx !== -1) {
            rawAmount = parseFloat(String(row[amtIdx]).replace(/,/g, ''));
            // If signed: positive = credit, negative = debit
            if (rawAmount > 0) {
              type = 'credit';
            } else {
              rawAmount = Math.abs(rawAmount);
              type = 'debit';
            }
          } else if (debitIdx !== -1 && creditIdx !== -1) {
            const debVal = parseFloat(String(row[debitIdx] || '').replace(/,/g, ''));
            const credVal = parseFloat(String(row[creditIdx] || '').replace(/,/g, ''));
            if (!isNaN(credVal) && credVal !== 0) {
              rawAmount = credVal;
              type = 'credit';
            } else if (!isNaN(debVal) && debVal !== 0) {
              rawAmount = debVal;
              type = 'debit';
            }
          }

          if (isNaN(rawAmount) || rawAmount === 0 || !rawDate) continue;

          extractedTransactions.push({
            date: formatParsedDate(String(rawDate)),
            description: String(rawDesc),
            amount: rawAmount,
            type
          });
        }
      }
    }
    
    // --- 2. PDF TEXT EXTRACTION ---
    if (fileType === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      // Initialize variables for PDF parsing
      // rawText already defined
      let pdfParsed = false;
      let e1 = null, e2 = null, e3 = null;
      const commonPasswords = ['1234', '0000', '123456', 'password', '1111'];
      const uint8Buffer = new Uint8Array(dataBuffer);
      // PDF parsing strategies wrapped to catch unexpected errors
      try {
        const PDFParseClass = await getPdfParseFunc();
        // Strategy 1: Try without password (unprotected PDF)
        try {
          const parser = new PDFParseClass(uint8Buffer);
          const parsedPdf = await parser.getText();
          rawText = parsedPdf.text;
          pdfParsed = true;
        } catch (err) { e1 = err; console.log('PDF parse without password failed:', err.message); }
        // Strategy 2: Try with empty password
        if (!pdfParsed) {
          try {
            const parser = new PDFParseClass({ data: uint8Buffer, password: '' });
            const parsedPdf = await parser.getText();
            rawText = parsedPdf.text;
            pdfParsed = true;
          } catch (err) { e2 = err; console.log('PDF parse with empty password failed:', err.message); }
        }
        // Strategy 3: Try common passwords
        if (!pdfParsed) {
          for (const pwd of commonPasswords) {
            try {
              const parser = new PDFParseClass({ data: uint8Buffer, password: pwd });
              const parsedPdf = await parser.getText();
              rawText = parsedPdf.text;
              pdfParsed = true;
              console.log(`PDF unlocked with common password pattern.`);
              break;
            } catch (err) { e3 = err; }
          }
        }
      } catch (outerErr) {
        console.error('Unexpected PDF parsing error:', outerErr);
      }
      
      // After all parsing attempts, determine why we failed
      if (!pdfParsed) {
        const passwordError = (e1 && e1.message && e1.message.toLowerCase().includes('password')) ||
                              (e2 && e2.message && e2.message.toLowerCase().includes('password')) ||
                              (e3 && commonPasswords.some(p => e3.message && e3.message.toLowerCase().includes(p)));
        if (passwordError) {
          console.error('PDF is password-protected. Rejecting upload.');
          await db.run('UPDATE statements SET status = ? WHERE id = ?', ['failed', statementId]);
          try { fs.unlinkSync(filePath); } catch (e) {}
          return res.status(400).json({
            error: 'The file appears to be encrypted or password-protected. Please ensure it is not password-protected and try uploading again.'
          });
        } else {
          console.error('PDF could not be parsed for unknown reasons.');
          await db.run('UPDATE statements SET status = ? WHERE id = ?', ['failed', statementId]);
          try { fs.unlinkSync(filePath); } catch (e) {}
          return res.status(400).json({
            error: 'File appears valid but could not be fully parsed after all attempts. PDF structure not supported by primary parser.'
          });
        }
      }

      // If we have extracted text, process it
      if (rawText && rawText.trim().length > 20) {
        // If Gemini Key is present, use LLM for beautiful structured extraction
        if (userGeminiKey) {
          try {
            extractedTransactions = await extractTransactionsWithGemini({ rawText }, userGeminiKey);
          } catch (e) {
            console.error('Gemini extraction failed, using fallback regex:', e);
            extractedTransactions = parseTextTransactions(rawText);
          }
        } else {
          extractedTransactions = parseTextTransactions(rawText);
        }
      } else {
        console.log('No extractable text found. Trying OCR processing...');
        if (userGeminiKey) {
          try {
            extractedTransactions = await extractTransactionsWithGemini({ fileBuffer: dataBuffer, mimeType: 'application/pdf' }, userGeminiKey);
          } catch (e) {
            console.error('Gemini OCR extraction failed:', e);
          }
        } else {
          console.error('No text found in PDF, and Gemini key missing for OCR fallback.');
        }
      }

      if (!extractedTransactions || extractedTransactions.length === 0) {
        console.error('Failed to extract any transactions from the PDF.');
        await db.run('UPDATE statements SET status = ? WHERE id = ?', ['failed', statementId]);
        try { fs.unlinkSync(filePath); } catch (e) {}
        return res.status(400).json({
          error: 'File appears valid but could not be fully parsed after all attempts. No extractable transactions found. If this is a scanned PDF, please provide a Gemini API key or use CSV/Excel.'
        });
      }
    }


    // --- 3. IMAGE EXTRACTION (OCR Tesseract) ---
    if (fileType === 'image') {
      const ocrResult = await Tesseract.recognize(filePath, 'eng', {
        logger: m => console.log('Tesseract OCR status:', m.status, Math.round(m.progress * 100) + '%')
      });
      rawText = ocrResult.data.text;

      if (userGeminiKey) {
        try {
          extractedTransactions = await extractTransactionsWithGemini({ rawText }, userGeminiKey);
        } catch (e) {
          console.error('Gemini OCR extraction failed, using fallback regex:', e);
          extractedTransactions = parseTextTransactions(rawText);
        }
      } else {
        extractedTransactions = parseTextTransactions(rawText);
      }
    }

    // Clean and categorize transactions
    const finalizedTransactions = [];
    for (const tx of extractedTransactions) {
      const cat = await categorizeTransaction(req.userId, tx.description, tx.amount, tx.type);
      finalizedTransactions.push({
        ...tx,
        category: cat,
        original_category: cat,
        statement_id: statementId,
        bank_name: filename.includes('opay') ? 'OPay' : filename.includes('gtbank') ? 'GTBank' : filename.includes('zenith') ? 'Zenith Bank' : 'Access Bank'
      });
    }

    // Save transactions in the database
    for (const tx of finalizedTransactions) {
      await db.run(
        `INSERT INTO transactions (statement_id, user_id, date, description, amount, type, category, original_category, bank_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tx.statement_id, req.userId, tx.date, tx.description, tx.amount, tx.type, tx.category, tx.original_category, tx.bank_name]
      );
    }

    // Update statement status to completed
    await db.run('UPDATE statements SET status = ? WHERE id = ?', ['completed', statementId]);

    // Cleanup uploaded file to save disk space
    try {
      fs.unlinkSync(filePath);
    } catch (e) {}

    res.json({
      message: `Statement uploaded and parsed successfully. Extracted ${finalizedTransactions.length} transactions.`,
      statementId,
      transactions: finalizedTransactions
    });

  } catch (err) {
    // Uniform error handling – guarantees a proper JSON response even if `res` is unavailable
    const sendError = (status, message, details) => {
      if (res && typeof res.status === 'function') {
        res.status(status).json({ error: message, details });
      } else {
        // Fallback to console error (Next.js will handle the 500 automatically)
        console.error('Critical upload error (no response object):', message, details);
      }
    };

    console.error('Upload statement error:', err);
    // Cleanup file in case of error
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}

    sendError(500, 'Server error processing statement.', err.message);
  }
});

// Gemini LLM Transaction Structuring
const extractTransactionsWithGemini = async (inputData, apiKey) => {
  // Initialize standard Gemini client (simulated or direct depending on Node package imports)
  // Let's implement a clean call to the generative SDK
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      You are an expert financial OCR assistant. Below is a bank statement (either raw text or a file).
      Analyze it and extract all transactions as a valid JSON array. Each transaction object MUST contain these exact properties:
      - date: in YYYY-MM-DD format
      - description: clean, readable description (e.g. rename "POS PURCHASE 8945 ABUJA" to "POS Purchase Abuja" or extract the merchant name)
      - amount: numerical value (absolute, positive float)
      - type: string either "debit" (for outgoing cash/payments/fees) or "credit" (for incoming cash/sales/transfers-in)

      Ignore balances, summary lines, and header details. If a row does not look like a complete transaction, skip it.

      ${inputData.rawText ? `Raw Text:\n"""\n${inputData.rawText.substring(0, 15000)}\n"""` : ''}

      Return ONLY the raw JSON array of objects. Do not include markdown code block syntax (like \`\`\`json) or any explanations.
    `;

    const contentArgs = [prompt];
    if (inputData.fileBuffer && inputData.mimeType) {
      contentArgs.push({
        inlineData: {
          data: inputData.fileBuffer.toString('base64'),
          mimeType: inputData.mimeType
        }
      });
    }

    const result = await model.generateContent(contentArgs);
    let jsonText = result.response.text().trim();
    
    // Clean up code blocks if the LLM included them
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
    }

    const txList = JSON.parse(jsonText);
    if (Array.isArray(txList)) {
      return txList.map(tx => ({
        date: tx.date || new Date().toISOString().split('T')[0],
        description: tx.description || 'Transaction',
        amount: Math.abs(parseFloat(tx.amount || 0)),
        type: tx.type === 'credit' ? 'credit' : 'debit'
      }));
    }
  } catch (err) {
    console.error('Gemini SDK call failed:', err);
    throw err;
  }
  return [];
};

// GET uploaded statements history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const statements = await db.query(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM transactions WHERE statement_id = s.id) as transaction_count,
              (SELECT SUM(amount) FROM transactions WHERE statement_id = s.id AND type = 'credit') as total_credits,
              (SELECT SUM(amount) FROM transactions WHERE statement_id = s.id AND type = 'debit') as total_debits
       FROM statements s 
       WHERE s.user_id = ? 
       ORDER BY s.upload_date DESC`,
      [req.userId]
    );
    res.json(statements);
  } catch (err) {
    console.error('Fetch statements history error:', err);
    res.status(500).json({ error: 'Server error retrieving statements.' });
  }
});

module.exports = router;
