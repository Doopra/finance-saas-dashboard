const Tesseract = require('tesseract.js');
const fs = require('fs');
fs.writeFileSync('dummy_tess.pdf', 'dummy content');
async function run() {
  try {
    console.log("Starting Tesseract...");
    await Tesseract.recognize('dummy_tess.pdf', 'eng');
    console.log("Finished Tesseract.");
  } catch (e) {
    console.log("Caught Error:", e.message);
  }
}
run();
