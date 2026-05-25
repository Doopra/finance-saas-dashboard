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
console.log('Type of pdfParse:', typeof pdfParse);
if (typeof pdfParse === 'function') {
  console.log('It is a function');
} else {
  console.log('Keys:', Object.keys(pdfParse));
  if (pdfParse.default) {
    console.log('Type of default:', typeof pdfParse.default);
  }
}
