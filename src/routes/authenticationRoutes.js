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
  createResetPasswordForForgotPassword,
  updateForgotPassword,
} = require("../controllers/Auth");
const { checkAuth, restriction } = require("../middlewares");

// const limiter = require("../lib/rateLimiter.js");

const router = express.Router();

router
  .route("/aprove-register/:requestId")
  .post(checkAuth, restriction("admin"), aproveRegistration)
  .delete(checkAuth, restriction("admin"), deleteRegistrationRequest);

router
  .route("/confirm-register/:registerId/confirm/:tokenId")
  .get(checkRegistrationExistance)
  .post(confirmRegistration);
// limiter("You exceed max confirm registration request count", 3),

// limiter("You exceed max change password request count", 3),
router
  .route("/update/pass/:userId")
  .post(checkAuth, restriction("user"), changePassword);

// limiter("You exceed max change email request count", 3),
router
  .route("/update/email/:userId")
  .post(checkAuth, restriction("user"), changeEmail);

router.route("/forgot-password").post(createResetPasswordForForgotPassword);

// limiter("You exceed max update password request count", 3),
router.route("/forgot-password/update").post(updateForgotPassword);

router.route("/register").post(registerUser);

// limiter("You exceed max login request count", 5),
router.route("/login").post(loginUser);

router.route("/logout").post(logoutUser);

router.route("/refresh").get(refresh);

module.exports = router;
