import express from 'express';
import { reactOnPost, getPostComments } from '../controllers/postController.js';
import { addComment } from '../controllers/commentsController.js';
import { checkAuth } from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/:postId/reaction').post(checkAuth, reactOnPost);

router.route('/:postId/comments').get(checkAuth, getPostComments).post(checkAuth, addComment);

export default router;
