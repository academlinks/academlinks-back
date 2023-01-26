const express = require("express");
const {
  getAllNotifications,
  deleteUserNotification,
  deleteAllUserNotification,
  markAsRead,
  markAllUserNotificationAsRead,
  getUnseenNotificationsCount,
  markNotificationAsSeen,
} = require("../controllers/notificationController.js");
const {
  checkAuth,
  restriction,
} = require("../controllers/authenticationController.js");

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

module.exports = router;
