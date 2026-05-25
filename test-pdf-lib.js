const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function createDummyPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  page.drawText('This is a dummy PDF file for testing.');
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('dummy.pdf', pdfBytes);
}
createDummyPDF();
