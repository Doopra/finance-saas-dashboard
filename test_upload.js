const fs = require('fs');
const path = require('path');
const db = require('./src/backend/database');

async function test() {
  await db.initDB();
  // We can mint a JWT token directly
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: 3 }, process.env.JWT_SECRET || 'antigravity_finance_jwt_secret_key_2026', { expiresIn: '1d' });
  
  // Create a dummy pdf file
  fs.writeFileSync('dummy.pdf', 'Dummy PDF Content');

  const FormData = require('form-data');
  const form = new FormData();
  form.append('statement', fs.createReadStream('dummy.pdf'));

  const axios = require('axios');
  try {
    const res = await axios.post('http://localhost:3000/api/statements/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log('UPLOAD SUCCESS:', res.data);
  } catch (err) {
    console.log('UPLOAD FAILED:', err.response ? err.response.data : err.message);
  }
}
test();
