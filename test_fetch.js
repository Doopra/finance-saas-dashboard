const fs = require('fs');
async function run() {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: 3 }, 'antigravity_finance_jwt_secret_key_2026', { expiresIn: '1d' });
  
  const FormData = require('form-data');
  const form = new FormData();
  form.append('statement', fs.createReadStream('dummy.csv'));

  const fetch = require('node-fetch'); // we can use native fetch or axios
  const axios = require('axios');
  try {
    const res = await axios.post('http://localhost:3000/api/statements/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.log("ERROR:", err.response ? err.response.status + ' ' + JSON.stringify(err.response.data) : err.message);
  }
}
run();
