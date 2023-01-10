import express from "express";
import {
  logIn,
  getUserLabels,
  getUserInfo,
  getRegistrationLabels,
  getRegistration,
  addCommercial,
  deleteCommercial,
  updateCommercial,
  resizeAndOptimiseMedia,
  uploadCommercialMediaFiles,
  getCommercials,
  getCommercial,
  getUsersForStatistic,
} from "../controllers/AdminController.js";
import {
  checkAuth,
  restriction,
} from "../controllers/authenticationController.js";

const router = express.Router();

router.route("/login").post(logIn);

router
  .route("/label/users")
  .get(checkAuth, restriction("admin"), getUserLabels);

router
  .route("/label/registrations")
  .get(checkAuth, restriction("admin"), getRegistrationLabels);

router
  .route("/users/:userId/info")
  .get(checkAuth, restriction("admin"), getUserInfo);

router
  .route("/users/statistic")
  .get(checkAuth, restriction("admin"), getUsersForStatistic);

router
  .route("/registrations/:registrationId")
  .get(checkAuth, restriction("admin"), getRegistration);

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

export default router;
