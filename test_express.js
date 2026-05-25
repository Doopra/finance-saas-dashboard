require('./src/backend/polyfill');
require('dotenv').config({path: '.env.local'});
const express = require('express');
const app = require('./src/backend/server');

const port = 3001;
app.listen(port, async () => {
  console.log('Test server running on port', port);
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: 3 }, process.env.JWT_SECRET || 'antigravity_finance_jwt_secret_key_2026', { expiresIn: '1d' });
  
  const fs = require('fs');
  fs.writeFileSync('dummy.csv', 'Date,Description,Amount,Type\n2026-05-25,Test Transaction,1000.00,credit');

  const FormData = require('form-data');
  const form = new FormData();
  form.append('statement', fs.createReadStream('dummy.csv'));

  const axios = require('axios');
  try {
    const res = await axios.post(`http://localhost:${port}/api/statements/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: 'Bearer ' + token
      }
    });
    console.log('UPLOAD SUCCESS:', res.data);
  } catch (err) {
    console.log('UPLOAD FAILED:', err.response ? err.response.data : err.message);
  }
  process.exit(0);
});
