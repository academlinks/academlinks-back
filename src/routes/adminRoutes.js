import express from "express";
import {
  logIn,
  getUserLabels,
  getUserInfo,
  getRegistrationLabels,
  getRegistration,
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
  .route("/registrations/:registrationId")
  .get(checkAuth, restriction("admin"), getRegistration);

export default router;
