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
import { checkAuth } from "../controllers/authenticationController.js";

const router = Router();

router.route("/:userId/last").get(checkAuth, getLastConversation);

router.route("/:userId/all").get(checkAuth, getAllConversation);

router.route("/:conversationId/read/:adressatId").patch(checkAuth, markAsRead);

router
  .route("/:userId/unseen")
  .get(checkAuth, getUnseenConversationCount)
  .patch(checkAuth, markConversationsAsSeen);

router.route("/:conversationId/:adressatId").patch(checkAuth, sendMessage);

router
  .route("/:id")
  .post(checkAuth, createConvesation)
  .delete(checkAuth, deleteConversation)
  .get(checkAuth, getConversation);

export default router;
