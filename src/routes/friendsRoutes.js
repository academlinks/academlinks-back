const express = require("express");
const {
  sendFriendRequest,
  cancelFriendRequest,
  deleteFriendRequest,
  confirmFriendRequest,
  deleteFriend,
  getUserFriends,
  getUserPendingRequest,
  getUserSentRequest,
  getPendingRequestsCount,
  markPendingRequestsAsSeen,
} = require("../controllers/Friends");
const { checkAuth, restriction } = require("../middlewares");

const router = express.Router();

router
  .route("/:userId/request")
  .post(checkAuth, restriction("user"), sendFriendRequest)
  .patch(checkAuth, restriction("user"), confirmFriendRequest);

router
  .route("/:userId/cancel-request")
  .delete(checkAuth, restriction("user"), deleteFriendRequest)
  .patch(checkAuth, restriction("user"), cancelFriendRequest);

router
  .route("/:userId/pending-requests")
  .get(checkAuth, restriction("user"), getUserPendingRequest);

router
  .route("/:userId/pending-requests/count")
  .get(checkAuth, restriction("user"), getPendingRequestsCount)
  .patch(checkAuth, restriction("user"), markPendingRequestsAsSeen);

router
  .route("/:userId/sent-requests")
  .get(checkAuth, restriction("user"), getUserSentRequest);

router
  .route("/:userId/friends")
  .get(checkAuth, restriction("user"), getUserFriends)
  .delete(checkAuth, restriction("user"), deleteFriend);

module.exports = router;
