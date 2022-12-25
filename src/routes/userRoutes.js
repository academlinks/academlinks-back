import express from "express";
import {
  uploadUserProfileFile,
  resizeAndOptimiseMedia,
  searchUsers,
  getUserProfile,
  getProfilePosts,
  getUserFeed,
  updateProfileImage,
  updateCoverImage,
  getBookmarks,
  isFriend,
  getPendingPosts,
  getHiddenPosts,
} from "../controllers/userController.js";
import {
  checkAuth,
  restriction,
} from "../controllers/authenticationController.js";

const router = express.Router();

router
  .route("/search")
  .get(checkAuth, restriction("user", "admin"), searchUsers);

router
  .route("/:userId/profile/posts")
  .get(checkAuth, restriction("user", "admin"), getProfilePosts);

router
  .route("/:userId/profile/bookmarks")
  .get(checkAuth, restriction("user"), getBookmarks);

router
  .route("/:userId/profile/pending-posts")
  .get(checkAuth, restriction("user"), getPendingPosts);

router
  .route("/:userId/profile/hidden-posts")
  .get(checkAuth, restriction("user"), getHiddenPosts);

router
  .route("/:userId/profile/profileImg")
  .post(
    checkAuth,
    restriction("user"),
    uploadUserProfileFile("profileImg"),
    resizeAndOptimiseMedia,
    updateProfileImage
  );

router
  .route("/:userId/profile/coverImg")
  .post(
    checkAuth,
    restriction("user"),
    uploadUserProfileFile("coverImg"),
    resizeAndOptimiseMedia,
    updateCoverImage
  );

router
  .route("/:userId/profile")
  .get(checkAuth, restriction("user"), getUserProfile);

router.route("/:userId/feed").get(checkAuth, restriction("user"), getUserFeed);

router.route("/:userId/isFriend").get(checkAuth, restriction("user"), isFriend);

export default router;
