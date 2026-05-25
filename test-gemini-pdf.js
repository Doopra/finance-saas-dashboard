require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY');
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const dataBuffer = fs.readFileSync('dummy.pdf');
  const prompt = "Extract text from this file.";
  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: dataBuffer.toString("base64"),
          mimeType: "application/pdf"
        }
      }
    ]);
    console.log('Success:', result.response.text());
  } catch (e) {
    console.error('Error:', e.message);
  }
}
run();
