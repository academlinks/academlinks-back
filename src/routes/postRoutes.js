import express from 'express';
import {
  uploadPostMediaFiles,
  resizeAndOptimiseMedia,
  createPost,
  deletePost,
  updatePost,
  reactOnPost,
  sharePost,
  getPostComments,
  getPost,
  isUserPost,
  savePost,
} from '../controllers/postController.js';
import { addComment } from '../controllers/commentsController.js';
import { checkAuth } from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/:postId/bookmark').post(checkAuth, savePost);

router.route('/:postId/reaction').post(checkAuth, reactOnPost);

router.route('/:postId/comments').get(checkAuth, getPostComments).post(checkAuth, addComment);

router.route('/:postId/options').get(checkAuth, isUserPost);

router
  .route('/:postId')
  .get(checkAuth, getPost)
  .post(checkAuth, sharePost)
  .delete(checkAuth, deletePost)
  .patch(checkAuth, uploadPostMediaFiles('images'), resizeAndOptimiseMedia, updatePost);

router
  .route('/')
  .post(checkAuth, uploadPostMediaFiles('images'), resizeAndOptimiseMedia, createPost);

export default router;
