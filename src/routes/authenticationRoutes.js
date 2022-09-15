import express from 'express';
import { loginUser } from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/login').post(loginUser);

export default router;
