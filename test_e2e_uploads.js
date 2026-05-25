const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { PDFDocument } = require('pdf-lib');
const xlsx = require('xlsx');

const API_URL = 'http://localhost:3000/api/statements/upload';

async function generateTestFiles() {
  if (!fs.existsSync('e2e_tests')) fs.mkdirSync('e2e_tests');

  // 1. Text PDF
  const pdfDoc1 = await PDFDocument.create();
  const page1 = pdfDoc1.addPage();
  page1.drawText('2026-05-10 Salary 5000.00 credit\n2026-05-12 POS Purchase 200.00 debit');
  fs.writeFileSync('e2e_tests/text.pdf', await pdfDoc1.save());

  // 2. CSV
  fs.writeFileSync('e2e_tests/data.csv', 'Date,Description,Amount,Type\n2026-05-10,Salary,5000,credit\n2026-05-12,Groceries,200,debit\n');

  // 3. Excel
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([['Date', 'Description', 'Amount', 'Type'], ['2026-05-10', 'Salary', 5000, 'credit']]);
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, 'e2e_tests/data.xlsx');

  // 4. Corrupt PDF
  fs.writeFileSync('e2e_tests/corrupt.pdf', 'Not a real PDF file data');

  // 5. Empty PDF
  const pdfDoc2 = await PDFDocument.create();
  pdfDoc2.addPage();
  fs.writeFileSync('e2e_tests/empty.pdf', await pdfDoc2.save());
}
let authToken = '';

async function loginUser() {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/register', {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'password123'
    });
    authToken = res.data.token;
    console.log('✅ Registered test user');
  } catch (e) {
    if (e.response?.data?.error === 'A user with this email already exists.') {
      const res = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
      authToken = res.data.token;
      console.log('✅ Logged in test user');
    } else {
      console.error('Login failed:', e.response?.data || e.message);
    }
  }
}

async function uploadFile(filePath) {
  const form = new FormData();
  form.append('statement', fs.createReadStream(filePath));
  try {
    const res = await axios.post(API_URL, form, {
      headers: { 
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`
      }
    });
    console.log(`✅ [${path.basename(filePath)}] Success: ${res.data.transactions?.length || 0} transactions extracted.`);
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    console.error(`❌ [${path.basename(filePath)}] Failed: ${msg}`);
  }
}

async function runTests() {
  await generateTestFiles();
  await loginUser();
  console.log('--- Starting E2E Upload Tests ---');
  await uploadFile('e2e_tests/text.pdf');
  await uploadFile('e2e_tests/data.csv');
  await uploadFile('e2e_tests/data.xlsx');
  await uploadFile('e2e_tests/corrupt.pdf');
  await uploadFile('e2e_tests/empty.pdf');
}

runTests();
