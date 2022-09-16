import express from 'express';
import {
  searchUsers,
  getUserProfile,
  getProfilePosts,
  getUserFeed,
} from '../controllers/userController.js';
import { checkAuth } from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/search').get(checkAuth, searchUsers);

router.route('/:userId/feed').get(checkAuth, getUserFeed);

router.route('/:userId/profile/posts').get(checkAuth, getProfilePosts);

router.route('/:userId/profile').get(checkAuth, getUserProfile);

export default router;
