import express from "express";
const { Router } = express;

import {
  deleteConversation,
  sendMessage,
  getConversation,
  getAllConversation,
  getLastConversation,
  createConvesation,
  markAsRead,
  getUnseenConversationCount,
  markConversationsAsSeen,
} from "../controllers/conversationController.js";
import {
  checkAuth,
  restriction,
} from "../controllers/authenticationController.js";

const router = Router();

router
  .route("/:userId/last")
  .get(checkAuth, restriction("user"), getLastConversation);

router
  .route("/:userId/all")
  .get(checkAuth, restriction("user"), getAllConversation);

router
  .route("/:conversationId/read/:adressatId")
  .patch(checkAuth, restriction("user"), markAsRead);

router
  .route("/:userId/unseen")
  .get(checkAuth, restriction("user"), getUnseenConversationCount)
  .patch(checkAuth, restriction("user"), markConversationsAsSeen);

router
  .route("/:conversationId/:adressatId")
  .patch(checkAuth, restriction("user"), sendMessage);

router
  .route("/:id")
  .post(checkAuth, restriction("user"), createConvesation)
  .delete(checkAuth, restriction("user"), deleteConversation)
  .get(checkAuth, restriction("user"), getConversation);

export default router;
