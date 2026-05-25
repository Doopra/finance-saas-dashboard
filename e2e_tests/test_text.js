const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
async function create() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  page.drawText('2026-05-10 Salary 5000.00 credit\n2026-05-12 POS Purchase 200.00 debit');
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('text.pdf', pdfBytes);
}
create();
