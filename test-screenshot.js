if (typeof global.DOMMatrix === 'undefined') { global.DOMMatrix = class DOMMatrix {}; }
if (typeof global.ImageData === 'undefined') { global.ImageData = class ImageData {}; }
if (typeof global.Path2D === 'undefined') { global.Path2D = class Path2D {}; }
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function run() {
  const dataBuffer = fs.readFileSync('dummy.pdf');
  const uint8Array = new Uint8Array(dataBuffer);
  const parser = new PDFParse(uint8Array); 
  try {
    const screens = await parser.getScreenshot({ imageDataUrl: true });
    console.log('Screens:', screens.pages.length);
    if (screens.pages.length > 0) {
      console.log('Page 1 keys:', Object.keys(screens.pages[0]));
      console.log('DataURL exists:', !!screens.pages[0].dataUrl);
    }
  } catch(e) {
    console.error('Error:', e);
  }
}
run();
