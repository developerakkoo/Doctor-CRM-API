import Report from '../../Modals/patient/report.js';

export const createReport = async (req, res) => {
  try {
    const { title, findings, fileUrl, patientId } = req.body;

    if (!title || !findings || !patientId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const report = new Report({
      title,
      findings,
      fileUrl,
      patient: patientId,
      uploadedBy: req.doctor._id  // Injected by middleware
    });

    await report.save();

    return res.status(201).json({ message: 'Report created successfully', report });
  } catch (err) {
    console.error('Error creating report:', err.message);
    return res.status(500).json({ message: 'Failed to create report' });
  }
};
