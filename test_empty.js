const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
async function create() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage();
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('empty.pdf', pdfBytes);
}
create();
