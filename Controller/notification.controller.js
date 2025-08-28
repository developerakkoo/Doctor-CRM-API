import Notification from '../Modals/Notification.js';
import Doctor from '../Modals/doctor/doctor.js';
import Patient from '../Modals/patient/patient.js';
import MedicalOwner from '../Modals/medicalOwner/medicalOwner.js';


// Send notification
export const sendNotification = async (req, res) => {
  try {
    const { recipientId, recipientModel, message, type } = req.body;

    const notification = new Notification({ recipientId, recipientModel, message, type });
    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: notification.toJSON() // ensures notificationId is included instead of _id
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: err.message
    });
  }
};


// Get all notifications for logged-in user
export const getNotifications = async (req, res) => {
  try {
    // Extract user role and ID from middleware-attached object
    const user = req.doctor || req.patient || req.user; // extend later for medicalOwner/subadmin
    const userId = user?._id;
    const role = user?.role;

    if (!userId || !role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user ID or role missing',
      });
    }

    // Capitalize first letter for recipientModel matching (e.g. "Doctor", "Patient")
    const recipientModel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

    const notifications = await Notification.find({
      recipientId: userId,
      recipientModel: recipientModel,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully',
      count: notifications.length,
      data: notifications,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: err.message,
    });
  }
};


// Mark specific notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user?._id || req.doctor?._id || req.patient?._id;
    const userModel = req.user?.role || req.doctor?.role || req.patient?.role;

    await Notification.updateMany({ recipientId: userId, recipientModel: userModel, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.notificationId);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    let filter = {};

    if (req.doctor) {
      filter = { recipientId: req.doctor._id, recipientModel: 'Doctor', isRead: false };
    } else if (req.patient) {
      filter = { recipientId: req.patient._id, recipientModel: 'Patient', isRead: false };
    } else if (req.medicalOwner) {
      filter = { recipientId: req.medicalOwner._id, recipientModel: 'MedicalOwner', isRead: false };
    } else {
      return res.status(403).json({ message: 'User not authorized' });
    }

    const count = await Notification.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Unread notification count fetched successfully',
      unreadCount: count,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const broadcastNotification = async (req, res) => {
  try {
    const { message, type, targetRole } = req.body;

    if (!message || !type || !targetRole) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: message, type, targetRole",
      });
    }

    let recipients = [];
    let recipientModel = "";

    if (targetRole === 'doctor') {
      recipients = await Doctor.find({}, '_id');
      recipientModel = 'Doctor';
    } else if (targetRole === 'patient') {
      recipients = await Patient.find({}, 'patientId');
      recipientModel = 'Patient';
    } else if (targetRole === 'medicalOwner') {
      recipients = await MedicalOwner.find({}, '_id');
      recipientModel = 'MedicalOwner';
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid targetRole. Must be 'doctor', 'patient', or 'medicalOwner'",
      });
    }

    const notifications = recipients.map((r) => ({
      recipientId: r._id || r.patientId,
      recipientModel,
      message,
      type,
    }));

    await Notification.insertMany(notifications);

    return res.status(200).json({
      success: true,
      message: `Notification broadcasted to all ${targetRole}s`,
      count: notifications.length
    });

  } catch (error) {
    console.error("Broadcast Notification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};