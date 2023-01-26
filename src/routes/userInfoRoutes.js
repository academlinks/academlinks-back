const express = require("express");
const {
  getUserInfo,
  addUserInfo,
  updateUserNestedInfo,
  deleteUserInfo,
  deleteNestedUserInfo,
} = require("../controllers/userInfoController.js");
const {
  checkAuth,
  restriction,
} = require("../controllers/authenticationController.js");

const router = express.Router();

router
  .route("/:userId")
  .get(checkAuth, restriction("user", "admin"), getUserInfo)
  .post(checkAuth, restriction("user"), addUserInfo);

router
  .route("/:userId/:field")
  .delete(checkAuth, restriction("user", "admin"), deleteUserInfo);

router
  .route("/:userId/:field/:docId")
  .patch(checkAuth, restriction("user"), updateUserNestedInfo)
  .delete(checkAuth, restriction("user", "admin"), deleteNestedUserInfo);

module.exports = router;
