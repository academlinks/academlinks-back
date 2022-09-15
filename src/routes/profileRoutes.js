import express from 'express';
import { getProfilePosts } from '../controllers/postController.js';
import { checkAuth } from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/:userId/posts').get(checkAuth, getProfilePosts);

export default router;
