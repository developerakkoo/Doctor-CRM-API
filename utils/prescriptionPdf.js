import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';


export const generatePrescriptionPDF = async ({ medicines = [], notes, diagnosis = '', date, patient, doctor }) => {

  const doc = new PDFDocument();
  const fileName = `${uuidv4()}_prescription.pdf`;
  const filePath = path.join('public/prescriptions', fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  doc.fontSize(20).text('Prescription', { align: 'center' }).moveDown();

  doc.fontSize(14).text(`Patient Name: ${patient.fullName}`);
  doc.text(`Patient ID: ${patient.patientId}`);
  doc.text(`Doctor: ${doctor.name}`);
  doc.text(`Date: ${new Date(date).toLocaleDateString()}`).moveDown();

  doc.text(`Diagnosis: ${diagnosis}`);

  doc.text('Medications:');

  medicines.forEach((med, index) => {
   doc.text(`${index + 1}. ${med.name} - ${med.dosage} - ${med.frequency}`);
  });

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(`/prescriptions/${fileName}`));
    writeStream.on('error', reject);
  });
};
