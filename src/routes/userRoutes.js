import express from 'express';
import {
  uploadUserProfileFile,
  searchUsers,
  getUserProfile,
  getProfilePosts,
  getUserFeed,
  updateProfileImage,
  updateCoverImage,
} from '../controllers/userController.js';
import { checkAuth } from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/search').get(checkAuth, searchUsers);

router.route('/:userId/profile/posts').get(checkAuth, getProfilePosts);

router
  .route('/:userId/profile/profileImg')
  .post(checkAuth, uploadUserProfileFile('profileImg'), updateProfileImage);

router
  .route('/:userId/profile/coverImg')
  .post(checkAuth, uploadUserProfileFile('coverImg'), updateCoverImage);

router.route('/:userId/profile').get(checkAuth, getUserProfile);

router.route('/:userId/feed').get(checkAuth, getUserFeed);

export default router;
