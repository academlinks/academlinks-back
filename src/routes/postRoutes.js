import express from 'express';
import {
  createPost,
  deletePost,
  uploadImages,
  resizeAndOptimiseMedia,
  updatePost,
  reactOnPost,
  getPostComments,
} from '../controllers/postController.js';
import { addComment } from '../controllers/commentsController.js';
import { checkAuth } from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/:postId/reaction').post(checkAuth, reactOnPost);

router.route('/:postId/comments').get(checkAuth, getPostComments).post(checkAuth, addComment);

router
  .route('/:postId')
  .delete(checkAuth, deletePost)
  .patch(checkAuth, uploadImages, resizeAndOptimiseMedia, updatePost);

router.route('/').post(checkAuth, uploadImages, resizeAndOptimiseMedia, createPost);

export default router;
