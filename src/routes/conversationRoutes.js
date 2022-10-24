import express from 'express';
const { Router } = express;

import {
  deleteConversation,
  sendMessage,
  getConversation,
  getAllConversation,
} from '../controllers/conversationController.js';
import { checkAuth } from '../controllers/authenticationController.js';

const router = Router();

router
  .route('/:id')
  .delete(checkAuth, deleteConversation)
  .patch(checkAuth, sendMessage)
  .get(checkAuth, getConversation);

router.route('/:userId/all').get(checkAuth, getAllConversation);

export default router;
