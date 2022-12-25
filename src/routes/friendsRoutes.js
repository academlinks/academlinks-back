import express from "express";
import {
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
} from "../controllers/friendsController.js";
import {
  checkAuth,
  restriction,
} from "../controllers/authenticationController.js";

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

export default router;
