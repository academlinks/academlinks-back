const express = require("express");
const {
  registerUser,
  checkRegistrationExistance,
  loginUser,
  logoutUser,
  refresh,
  aproveRegistration,
  deleteRegistrationRequest,
  confirmRegistration,
  changeEmail,
  changePassword,
  checkAuth,
  restriction,
  createResetPasswordForForgotPassword,
  updateForgotPassword,
} = require("../controllers/authenticationController.js");
const limiter = require("../lib/rateLimiter.js");

const router = express.Router();

router
  .route("/aprove-register/:requestId")
  .post(checkAuth, restriction("admin"), aproveRegistration)
  .delete(checkAuth, restriction("admin"), deleteRegistrationRequest);

router
  .route("/confirm-register/:registerId/confirm/:tokenId")
  .get(checkRegistrationExistance)
  .post(
    limiter("You exceed max confirm registration request count"),
    confirmRegistration
  );

router
  .route("/update/pass/:userId")
  .post(
    limiter("You exceed max change password request count"),
    checkAuth,
    restriction("user"),
    changePassword
  );

router
  .route("/update/email/:userId")
  .post(
    limiter("You exceed max change email request count"),
    checkAuth,
    restriction("user"),
    changeEmail
  );

router.route("/forgot-password").post(createResetPasswordForForgotPassword);

router
  .route("/forgot-password/update")
  .post(
    limiter("You exceed max update password request count"),
    updateForgotPassword
  );

router.route("/register").post(registerUser);

router
  .route("/login")
  .post(limiter("You exceed max login request count"), loginUser);

router.route("/logout").post(checkAuth, logoutUser);

router.route("/refresh").get(refresh);

module.exports = router;
