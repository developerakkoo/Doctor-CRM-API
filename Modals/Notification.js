import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientModel',
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ['Doctor', 'Patient', 'SubAdmin', 'MedicalOwner'],
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'alert', 'chat', 'appointment', 'bill', 'report'],
      default: 'info',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.notificationId = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export default mongoose.model('Notification', notificationSchema);
