import express from 'express';
const { Router } = express;

import {
  deleteConversation,
  sendMessage,
  getConversation,
  getAllConversation,
  getLastConversation,
  createConvesation,
} from '../controllers/conversationController.js';
import { checkAuth } from '../controllers/authenticationController.js';

const router = Router();

router.route('/:userId/last').get(checkAuth, getLastConversation);

router.route('/:userId/all').get(checkAuth, getAllConversation);

router
  .route('/:id')
  .post(checkAuth, createConvesation)
  .delete(checkAuth, deleteConversation)
  .patch(checkAuth, sendMessage)
  .get(checkAuth, getConversation);

export default router;
