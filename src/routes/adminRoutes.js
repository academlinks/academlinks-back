import express from "express";

import {
  logIn,
  // media upload
  resizeAndOptimiseMedia,
  uploadCommercialMediaFiles,
  // commercials
  addCommercial,
  updateCommercial,
  deleteCommercial,
  getCommercial,
  getCommercials,
  // Registration
  getRegistration,
  getRegistrationLabels,
  // users
  getUserLabels,
  getUserInfo,
  getUsersForStatistic,
  // notifications
  getBadges,
  getNotifications,
  getNotification,
  deleteAllNotifications,
  deleteNotification,
  markNotificationsAsSeen,
  markNotificationAsRead,
  sendEmailToCommercialCustomer,
} from "../controllers/adminController.js";

import {
  checkAuth,
  restriction,
} from "../controllers/authenticationController.js";

const router = express.Router();

router.route("/login").post(logIn);

////////////////////////////
////////// Users //////////
//////////////////////////
router
  .route("/label/users")
  .get(checkAuth, restriction("admin"), getUserLabels);

router
  .route("/users/:userId/info")
  .get(checkAuth, restriction("admin"), getUserInfo);

router
  .route("/users/statistic")
  .get(checkAuth, restriction("admin"), getUsersForStatistic);

///////////////////////////////////
////////// Registration //////////
/////////////////////////////////

router
  .route("/registrations/:registrationId")
  .get(checkAuth, restriction("admin"), getRegistration);

router
  .route("/label/registrations")
  .get(checkAuth, restriction("admin"), getRegistrationLabels);

//////////////////////////////////
////////// Commercials //////////
////////////////////////////////

router
  .route("/commercials/customer")
  .post(checkAuth, restriction("admin"), sendEmailToCommercialCustomer);

router
  .route("/commercials/:commercialId")
  .get(checkAuth, restriction("admin"), getCommercial)
  .patch(
    checkAuth,
    restriction("admin"),
    uploadCommercialMediaFiles("image"),
    resizeAndOptimiseMedia,
    updateCommercial
  )
  .delete(checkAuth, restriction("admin"), deleteCommercial);

router
  .route("/commercials")
  .get(checkAuth, restriction("admin"), getCommercials)
  .post(
    checkAuth,
    restriction("admin"),
    uploadCommercialMediaFiles("image"),
    resizeAndOptimiseMedia,
    addCommercial
  );

////////////////////////////////////
////////// Notifications //////////
//////////////////////////////////

router.route("/badges").get(checkAuth, restriction("admin"), getBadges);

router
  .route("/notifications")
  .get(checkAuth, restriction("admin"), getNotifications)
  .delete(checkAuth, restriction("admin"), deleteAllNotifications)
  .patch(checkAuth, restriction("admin"), markNotificationsAsSeen);

router
  .route("/notifications/:notificationId")
  .get(checkAuth, restriction("admin"), getNotification)
  .delete(checkAuth, restriction("admin"), deleteNotification)
  .patch(checkAuth, restriction("admin"), markNotificationAsRead);

export default router;
