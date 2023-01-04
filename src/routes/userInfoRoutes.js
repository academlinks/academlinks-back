import express from "express";
import {
  getUserInfo,
  addUserInfo,
  updateUserNestedInfo,
  deleteUserInfo,
  deleteNestedUserInfo,
} from "../controllers/userInfoController.js";
import {
  checkAuth,
  restriction,
} from "../controllers/authenticationController.js";

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

export default router;
