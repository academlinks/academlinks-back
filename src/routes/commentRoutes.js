const express = require("express");
const {
  updateComment,
  deleteComment,
  pinComment,
  reactOnComment,
  addCommentReply,
  updateCommentReply,
  deleteCommentReply,
  pinCommentReply,
  reactOnCommentReply,
} = require("../controllers/commentsController.js");
const { checkAuth, restriction } = require("../middlewares");

const router = express.Router();

router.route("/:commentId/reply").post(checkAuth, addCommentReply);

router
  .route("/:commentId/reply/:replyId")
  .patch(checkAuth, restriction("user"), updateCommentReply)
  .delete(checkAuth, restriction("user", "admin"), deleteCommentReply);

router
  .route("/:commentId/reply/:replyId/pin")
  .patch(checkAuth, restriction("user"), pinCommentReply);

router
  .route("/:commentId/reply/:replyId/reaction")
  .patch(checkAuth, restriction("user"), reactOnCommentReply);

router
  .route("/:commentId/pin")
  .patch(checkAuth, restriction("user"), pinComment);

router
  .route("/:commentId/reaction")
  .patch(checkAuth, restriction("user"), reactOnComment);

router
  .route("/:commentId")
  .patch(checkAuth, restriction("user"), updateComment)
  .delete(checkAuth, restriction("user", "admin"), deleteComment);

module.exports = router;
