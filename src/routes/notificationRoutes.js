import express from "express";
import {
  getAllNotifications,
  deleteUserNotification,
  deleteAllUserNotification,
  markAsRead,
  markAllUserNotificationAsRead,
  getUnseenNotificationsCount,
  markNotificationAsSeen,
} from "../controllers/notificationController.js";
import {
  checkAuth,
  restriction,
} from "../controllers/authenticationController.js";

const router = express.Router();

router
  .route("/notify/:notifyId")
  .delete(checkAuth, restriction("user"), deleteUserNotification)
  .patch(checkAuth, restriction("user"), markAsRead);

router
  .route("/:userId")
  .get(checkAuth, restriction("user"), getAllNotifications);

router
  .route("/:userId/unseen")
  .get(checkAuth, restriction("user"), getUnseenNotificationsCount)
  .patch(checkAuth, restriction("user"), markNotificationAsSeen);

router
  .route("")
  .delete(checkAuth, restriction("user"), deleteAllUserNotification)
  .patch(checkAuth, restriction("user"), markAllUserNotificationAsRead);

export default router;
