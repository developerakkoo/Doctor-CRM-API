import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  senderId: {
    type: String, // Changed from ObjectId
    required: true
  },
  recipientId: {
    type: String, // Changed from ObjectId
    required: true
  },
  message: {
    type: String,
    required: true
  },
  sentBy: {
    type: String,
    enum: ['Patient', 'Doctor'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});


const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
