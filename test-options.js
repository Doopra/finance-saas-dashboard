if (typeof global.DOMMatrix === 'undefined') { global.DOMMatrix = class DOMMatrix {}; }
if (typeof global.ImageData === 'undefined') { global.ImageData = class ImageData {}; }
if (typeof global.Path2D === 'undefined') { global.Path2D = class Path2D {}; }
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function run() {
  const dataBuffer = fs.readFileSync('dummy.pdf');
  const uint8Array = new Uint8Array(dataBuffer);
  const parser = new PDFParse({ data: uint8Array, password: 'wrong' }); 
  try {
    const result = await parser.getText();
    console.log('Success!', result.text.substring(0, 30));
  } catch(e) {
    console.error('Error:', e.message);
  }
}
run();
