import express from 'express';
import {
  updateComment,
  deleteComment,
  pinComment,
  reactOnComment,
  addCommentReply,
  updateCommentReply,
  deleteCommentReply,
  pinCommentReply,
  reactOnCommentReply,
} from '../controllers/commentsController.js';
import { checkAuth } from '../controllers/authenticationController.js';

const router = express.Router();

router.route('/:commentId/reply').post(checkAuth, addCommentReply);

router
  .route('/:commentId/reply/:replyId')
  .patch(checkAuth, updateCommentReply)
  .delete(checkAuth, deleteCommentReply);

router.route('/:commentId/reply/:replyId/pin').patch(checkAuth, pinCommentReply);

router.route('/:commentId/reply/:replyId/reaction').patch(checkAuth, reactOnCommentReply);

router.route('/:commentId/pin').patch(checkAuth, pinComment);

router.route('/:commentId/reaction').patch(checkAuth, reactOnComment);

router.route('/:commentId').patch(checkAuth, updateComment).delete(checkAuth, deleteComment);

export default router;
