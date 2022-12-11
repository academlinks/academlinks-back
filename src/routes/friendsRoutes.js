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
import { checkAuth } from "../controllers/authenticationController.js";

const router = express.Router();

router
  .route("/:userId/request")
  .post(checkAuth, sendFriendRequest)
  .patch(checkAuth, confirmFriendRequest);

router
  .route("/:userId/cancel-request")
  .delete(checkAuth, deleteFriendRequest)
  .patch(checkAuth, cancelFriendRequest);

router.route("/:userId/pending-requests").get(checkAuth, getUserPendingRequest);

router
  .route("/:userId/pending-requests/count")
  .get(checkAuth, getPendingRequestsCount)
  .patch(checkAuth, markPendingRequestsAsSeen);

router.route("/:userId/sent-requests").get(checkAuth, getUserSentRequest);

router
  .route("/:userId/friends")
  .get(checkAuth, getUserFriends)
  .delete(checkAuth, deleteFriend);

export default router;
