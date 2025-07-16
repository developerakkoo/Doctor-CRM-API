import express from 'express';
import { sendNotification, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, getUnreadNotificationCount, broadcastNotification
} from '../../Controller/notification.controller.js';

import { verifyAccess } from '../../middlewares/auth.middleware.js'; // Adjust if you use different middlewares

const router = express.Router();

router.post('/send', sendNotification); 


// Pass allowed roles explicitly
router.get('/', verifyAccess(['doctor', 'patient', 'medicalOwner','subadmin']), getNotifications);

router.put('/mark-read/:notificationId', verifyAccess(['doctor', 'patient', 'medicalOwner','subadmin']), markNotificationAsRead);

router.put('/mark-all-read', verifyAccess(['doctor', 'patient', 'medicalOwner','subadmin']), markAllNotificationsAsRead);

router.delete('/:notificationId', verifyAccess(['doctor', 'patient', 'medicalOwner','subadmin']), deleteNotification);

router.get('/unread-count', verifyAccess(['doctor', 'patient', 'medicalOwner']), getUnreadNotificationCount);

router.post('/broadcast', broadcastNotification);


export default router;