import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';

export const generateBillPDF = async ({ patient, doctor, date, services, totalAmount, billNo }) => {
  const doc = new PDFDocument();
  const fileName = `${uuidv4()}_bill.pdf`;
  const filePath = path.join('public/bills', fileName);

  // Ensure the bills directory exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  //  Title
  doc.fontSize(20).text('Medical Bill', { align: 'center' }).moveDown();

  // Bill & Patient Info
  doc.fontSize(14)
    .text(`Bill No: ${billNo}`)
    .text(`Patient Name: ${patient.fullName}`)
    .text(`Patient ID: ${patient.patientId}`)
    .text(`Doctor Name: ${doctor.fullName || doctor.name}`)
    .text(`Date: ${new Date(date).toLocaleDateString()}`)
    .moveDown();

  // 🛠️ Services List
  doc.fontSize(13).text('Services Rendered:');
  services.forEach((service, idx) => {
    const name = service.name || service.serviceName || 'Unnamed Service';
    const cost = typeof service.cost === 'number' ? service.cost : 0;
    doc.text(`${idx + 1}. ${name} - ₹${cost}`);
  });

  // 💰 Total
  doc.moveDown()
    .font('Helvetica-Bold')
    .text(`Total Amount: ₹${totalAmount}`, { align: 'right' });

  // End and return promise with file path
  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(`/bills/${fileName}`));
    writeStream.on('error', reject);
  });
};
