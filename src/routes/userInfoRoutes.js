import express from "express";
import {
  getUserInfo,
  updateUserInfo,
  addUserInfo,
  deleteUserInfo,
} from "../controllers/userInfoController.js";
import {
  checkAuth,
  restriction,
} from "../controllers/authenticationController.js";

const router = express.Router();

router
  .route("/:userId")
  .get(checkAuth, restriction("user", "admin"), getUserInfo)
  .post(checkAuth, restriction("user"), addUserInfo)
  .patch(checkAuth, restriction("user"), updateUserInfo)
  .delete(checkAuth, restriction("user", "admin"), deleteUserInfo);

export default router;
