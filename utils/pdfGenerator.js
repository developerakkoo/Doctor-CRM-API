import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';

export const generateReportPDF = async ({ title, findings, date, patient, doctor }) => {
  const doc = new PDFDocument();
  const fileName = `${uuidv4()}_report.pdf`;
  const filePath = path.join('public/reports', fileName);

  // Ensure the folder exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  doc.fontSize(20).text('Medical Report', { align: 'center' });
  doc.moveDown();

  doc.fontSize(14).text(`Patient Name: ${patient?.fullName || 'N/A'}`);
  doc.text(`Patient ID: ${patient?.patientId || 'N/A'}`);
  doc.text(`Doctor: ${doctor?.name || 'N/A'}`);
  doc.text(`Date: ${new Date(date).toLocaleDateString()}`);
  doc.moveDown();
  doc.text(`Title: ${title}`);
  doc.moveDown();
  doc.text(`Findings:\n${findings}`);

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(`/reports/${fileName}`));
    writeStream.on('error', (err) => {
      console.error('PDF write error:', err);
      reject(err);
    });
  });
};
