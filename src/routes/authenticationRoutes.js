import express from "express";
import {
  registerUser,
  checkRegistrationExistance,
  loginUser,
  logoutUser,
  refresh,
  aproveRegistration,
  deleteRegistrationRequest,
  confirmRegistration,
  checkAuth,
  restriction,
} from "../controllers/authenticationController.js";

const router = express.Router();

router
  .route("/aprove-register/:requestId")
  .post(checkAuth, restriction("admin"), aproveRegistration)
  .delete(checkAuth, restriction("admin"), deleteRegistrationRequest);

router
  .route("/confirm-register/:registerId/confirm/:tokenId")
  .get(checkRegistrationExistance)
  .post(confirmRegistration);

router.route("/register").post(registerUser);

router.route("/login").post(loginUser);

router.route("/logout").post(logoutUser);

router.route("/refresh").get(refresh);

export default router;
