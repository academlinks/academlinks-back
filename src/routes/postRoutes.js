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
  getBlogPosts,
  getTopRatedBlogPosts,
  getTopRatedPublishers,
  getRelatedPosts,
  changePostAudience,
  removeTagFromPost,
  reviewTaggedPosts,
} from '../controllers/postController.js';
import { addComment } from '../controllers/commentsController.js';
import { checkAuth, restriction } from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/:postId/bookmark').post(checkAuth, savePost);

router.route('/:postId/reaction').post(checkAuth, reactOnPost);

router.route('/:postId/comments').get(checkAuth, getPostComments).post(checkAuth, addComment);

router.route('/:postId/options').get(checkAuth, isUserPost);

router.route('/:postId/tag').delete(checkAuth, removeTagFromPost);

router.route('/:postId/aprove-post').patch(checkAuth, reviewTaggedPosts);

router
  .route('/:postId/audience')
  .patch(checkAuth, restriction('user', 'administrator'), changePostAudience);

router.route('/blogPosts').get(checkAuth, getBlogPosts);

router.route('/blogPosts/topRated').get(checkAuth, getTopRatedBlogPosts);

router.route('/blogPosts/topRatedPublishers').get(checkAuth, getTopRatedPublishers);

router.route('/blogPosts/relatedPosts/:postId').get(checkAuth, getRelatedPosts);

router
  .route('/:postId')
  .get(checkAuth, restriction('user', 'guest', 'administrator'), getPost)
  .post(checkAuth, sharePost)
  .delete(checkAuth, deletePost)
  .patch(checkAuth, uploadPostMediaFiles('images'), resizeAndOptimiseMedia, updatePost);

router
  .route('/')
  .post(checkAuth, uploadPostMediaFiles('images'), resizeAndOptimiseMedia, createPost);

export default router;
