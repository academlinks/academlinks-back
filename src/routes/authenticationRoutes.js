import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  refresh,
} from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/register').post(registerUser);

router.route('/login').post(loginUser);

router.route('/logout').post(logoutUser);

router.route('/refresh').get(refresh);

export default router;
