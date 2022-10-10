import express from 'express';
import {
  getUserInfo,
  updateUserInfo,
  addUserInfo,
  deleteUserInfo,
} from '../controllers/userInfoController.js';
import { checkAuth, restriction } from '../controllers/authenticationController.js';

const router = express.Router();

router
  .route('/:userId')
  .get(checkAuth, getUserInfo)
  .post(checkAuth, addUserInfo)
  .patch(checkAuth, updateUserInfo)
  .delete(checkAuth, deleteUserInfo);

export default router;
