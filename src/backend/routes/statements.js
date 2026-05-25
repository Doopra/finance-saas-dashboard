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

const pdfParse = require('pdf-parse');
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
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.csv', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only PDF, CSV, Excel, or Images are allowed.'));
    }
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
  
  // Date patterns: DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YYYY, etc.
  const dateRegex = /\b(\d{1,2})[-/](\d{1,2}|\w{3})[-/](\d{2,4})\b|\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/;
  // Currency/Amount patterns: ₦1,234.56, 12,345.00, etc.
  const amountRegex = /\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/;

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
    const numbers = remaining.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g) || [];
    
    if (numbers.length === 0) return;
    
    // The first number is typically the transaction amount
    const amountVal = parseFloat(numbers[0].replace(/,/g, ''));
    if (isNaN(amountVal) || amountVal === 0) return;

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
    const isCredit = cleanLine.toLowerCase().includes('cr') || 
                     cleanLine.toLowerCase().includes('credit') || 
                     cleanLine.toLowerCase().includes('inflow') ||
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

// Utility to normalize date strings
const formatParsedDate = (dateStr) => {
  try {
    const clean = dateStr.replace(/[-/]/g, ' ');
    const parts = clean.split(/\s+/);
    if (parts.length === 3) {
      // If it starts with a year: YYYY MM DD -> YYYY-MM-DD
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // If it ends with a year: DD MM YYYY -> YYYY-MM-DD
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
    else if (fileType === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      
      // Many Nigerian bank statement PDFs are password-protected
      // Common passwords: empty string, account number, DOB, phone number
      // We try multiple strategies before falling back to OCR
      let pdfParsed = false;
      
      // Strategy 1: Try without password (unprotected PDF)
      try {
        const parsedPdf = await pdfParse(dataBuffer);
        rawText = parsedPdf.text;
        pdfParsed = true;
      } catch (e1) {
        console.log('PDF parse without password failed:', e1.message);
      }
      
      // Strategy 2: Try with empty password (common for bank PDFs)
      if (!pdfParsed) {
        try {
          const parsedPdf = await pdfParse(dataBuffer, { password: '' });
          rawText = parsedPdf.text;
          pdfParsed = true;
        } catch (e2) {
          console.log('PDF parse with empty password failed:', e2.message);
        }
      }
      
      // Strategy 3: Try with common bank password patterns
      if (!pdfParsed) {
        const commonPasswords = ['1234', '0000', '123456', 'password', '1111'];
        for (const pwd of commonPasswords) {
          try {
            const parsedPdf = await pdfParse(dataBuffer, { password: pwd });
            rawText = parsedPdf.text;
            pdfParsed = true;
            console.log(`PDF unlocked with common password pattern.`);
            break;
          } catch (ep) {
            // Continue trying
          }
        }
      }
      
      // Strategy 4: If still locked, try OCR on the PDF as an image-like fallback
      if (!pdfParsed) {
        console.log('PDF is password-protected. Attempting Tesseract OCR fallback...');
        try {
          // Convert PDF to image-like text extraction via OCR
          const ocrResult = await Tesseract.recognize(filePath, 'eng', {
            logger: m => console.log('PDF OCR fallback:', m.status, `${Math.round(m.progress * 100)}%`)
          });
          rawText = ocrResult.data.text;
          pdfParsed = true;
          console.log('PDF OCR fallback extracted text successfully.');
        } catch (ocrErr) {
          console.error('PDF OCR fallback also failed:', ocrErr.message);
          // Return a user-friendly error message
          await db.run('UPDATE statements SET status = ? WHERE id = ?', ['failed', statementId]);
          
          // Cleanup file
          try { fs.unlinkSync(filePath); } catch (e) {}
          
          return res.status(400).json({ 
            error: 'This PDF is password-protected and we could not unlock it automatically. Please try: (1) removing the password using your bank app, (2) downloading an unprotected version, or (3) exporting your statement as CSV/Excel instead.' 
          });
        }
      }

      // If we have extracted text, process it
      if (rawText && rawText.trim().length > 20) {
        // If Gemini Key is present, use LLM for beautiful structured extraction
        if (userGeminiKey) {
          try {
            extractedTransactions = await extractTransactionsWithGemini(rawText, userGeminiKey);
          } catch (e) {
            console.error('Gemini extraction failed, using fallback regex:', e);
            extractedTransactions = parseTextTransactions(rawText);
          }
        } else {
          extractedTransactions = parseTextTransactions(rawText);
        }
      } else {
        console.log('PDF text extraction yielded minimal text. Using fallback regex on raw content.');
        extractedTransactions = parseTextTransactions(rawText || '');
      }
    }


    // --- 3. IMAGE EXTRACTION (OCR Tesseract) ---
    else if (fileType === 'image') {
      const ocrResult = await Tesseract.recognize(filePath, 'eng', {
        logger: m => console.log('Tesseract OCR status:', m.status, `${Math.round(m.progress * 100)}%`)
      });
      rawText = ocrResult.data.text;

      if (userGeminiKey) {
        try {
          extractedTransactions = await extractTransactionsWithGemini(rawText, userGeminiKey);
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
    console.error('Upload statement error:', err);
    // Cleanup file in case of error
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}

    res.status(500).json({ error: 'Server error processing statement.' });
  }
});

// Gemini LLM Transaction Structuring
const extractTransactionsWithGemini = async (rawText, apiKey) => {
  // Initialize standard Gemini client (simulated or direct depending on Node package imports)
  // Let's implement a clean call to the generative SDK
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      You are an expert financial OCR assistant. Below is the raw text extracted from a bank statement.
      Analyze the text and extract all transactions as a valid JSON array. Each transaction object MUST contain these exact properties:
      - date: in YYYY-MM-DD format
      - description: clean, readable description (e.g. rename "POS PURCHASE 8945 ABUJA" to "POS Purchase Abuja" or extract the merchant name)
      - amount: numerical value (absolute, positive float)
      - type: string either "debit" (for outgoing cash/payments/fees) or "credit" (for incoming cash/sales/transfers-in)

      Ignore balances, summary lines, and header details. If a row does not look like a complete transaction, skip it.

      Raw Text:
      """
      ${rawText.substring(0, 15000)}
      """

      Return ONLY the raw JSON array of objects. Do not include markdown code block syntax (like \`\`\`json) or any explanations.
    `;

    const result = await model.generateContent(prompt);
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
