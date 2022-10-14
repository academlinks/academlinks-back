import express from 'express';
import {
  getAllNotifications,
  markAsRead,
  deleteUserNotification,
} from '../controllers/notificationController.js';
import { checkAuth, restriction } from '../controllers/authenticationController.js';

const router = express.Router();

router
  .route('/notify/:notifyId')
  .delete(checkAuth, deleteUserNotification)
  .patch(checkAuth, markAsRead);

router.route('/:userId').get(checkAuth, getAllNotifications);

export default router;
