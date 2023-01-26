const express = require("express");

const {
  deleteConversation,
  sendMessage,
  getConversation,
  getAllConversation,
  getLastConversation,
  createConvesation,
  markAsRead,
  getUnseenConversationCount,
  markConversationsAsSeen,
} = require("../controllers/conversationController.js");
const {
  checkAuth,
  restriction,
} = require("../controllers/authenticationController.js");

const router = express.Router();

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

module.exports = router;
