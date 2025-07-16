import Chat from '../../Modals/patient/chat.js'; // adjust path if needed

export const sendMessageToDoctor = async (req, res) => {
  try {
    const { message, recipientDoctorId } = req.body;

    // Defensive check
    if (!req.patient || !req.patient.patientId) {
      return res.status(401).json({ message: 'Unauthorized: Patient not found in request context' });
    }

const patientObjectId = req.patient._id;

    if (!message || !recipientDoctorId) {
      return res.status(400).json({ message: 'Message and recipientDoctorId are required' });
    }

    const chatMessage = {
  senderId: patientObjectId,
      recipientId: recipientDoctorId,
      message,
      sentBy: 'Patient',
      timestamp: new Date()
    };

    await Chat.create(chatMessage);

    res.status(201).json({ message: 'Message sent successfully', chat: chatMessage });
  } catch (err) {
    console.error('Chat Send Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getChatHistory = async (req, res) => {
  try {
    const patientId = req.patient.patientId;
    const { doctorId } = req.query;

    const query = {
      $or: [
        { senderId: patientId, recipientId: doctorId },
        { senderId: doctorId, recipientId: patientId }
      ]
    };

    // If no doctorId provided, get all chat involving the patient
    if (!doctorId) {
      query.$or = [
        { senderId: patientId },
        { recipientId: patientId }
      ];
    }

    const chatHistory = await Chat.find(query).sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      message: 'Chat history retrieved successfully',
      chatHistory
    });
  } catch (error) {
    console.error('Chat history retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};