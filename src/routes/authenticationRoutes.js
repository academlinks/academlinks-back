import express from 'express';
import { loginUser, registerUser, refresh } from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/register').post(registerUser);

router.route('/login').post(loginUser);

router.route('/refresh').get(refresh);

export default router;
