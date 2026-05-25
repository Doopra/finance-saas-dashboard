const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ userId: 3 }, 'antigravity_finance_jwt_secret_key_2026', { expiresIn: '1d' });
// Generate 5MB file
const buffer = Buffer.alloc(5 * 1024 * 1024, 'A');
fs.writeFileSync('large_dummy.csv', buffer);

async function run() {
  const form = new FormData();
  form.append('statement', fs.createReadStream('large_dummy.csv'));

  try {
    const res = await axios.post('http://localhost:3000/api/statements/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log("SUCCESS:", res.status);
  } catch (err) {
    console.log("ERROR:", err.response ? err.response.status + ' ' + err.response.statusText : err.message);
  }
}
run();
