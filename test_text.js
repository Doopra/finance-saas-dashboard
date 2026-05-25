const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
async function create() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  page.drawText('10/05/2026 Salary Inflow 5000\n12/05/2026 POS Purchase Abuja 200');
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('text.pdf', pdfBytes);
}
create();
