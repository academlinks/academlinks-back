import express from "express";
import {
  uploadPostMediaFiles,
  resizeAndOptimiseMedia,
  createPost,
  deletePost,
  updatePost,
  reactOnPost,
  sharePost,
  getPostComments,
  getPost,
  isUserPost,
  savePost,
  getBlogPosts,
  getTopRatedBlogPosts,
  getTopRatedPublishers,
  getRelatedPosts,
  changePostAudience,
  removeTagFromPost,
  reviewTaggedPosts,
  addPostToProfile,
  hidePostFromProfile,
} from "../controllers/postController.js";
import { addComment } from "../controllers/commentsController.js";
import {
  checkAuth,
  restriction,
} from "../controllers/authenticationController.js";

const router = express.Router();

router
  .route("/:postId/bookmark")
  .post(checkAuth, restriction("user"), savePost);

router
  .route("/:postId/reaction")
  .post(checkAuth, restriction("user"), reactOnPost);

router
  .route("/:postId/comments")
  .get(checkAuth, restriction("user", "admin"), getPostComments)
  .post(checkAuth, addComment);

router
  .route("/:postId/options")
  .get(checkAuth, restriction("user"), isUserPost);

router
  .route("/:postId/tag")
  .delete(checkAuth, restriction("user"), removeTagFromPost);

router
  .route("/:postId/aprove-post")
  .patch(checkAuth, restriction("user"), reviewTaggedPosts);

router
  .route("/:postId/show-post")
  .patch(checkAuth, restriction("user"), addPostToProfile);

router
  .route("/:postId/hide-post")
  .patch(checkAuth, restriction("user"), hidePostFromProfile);

router
  .route("/:postId/audience")
  .patch(checkAuth, restriction("user"), changePostAudience);

router
  .route("/blogPosts")
  .get(checkAuth, restriction("user", "admin"), getBlogPosts);

router
  .route("/blogPosts/topRated")
  .get(checkAuth, restriction("user", "admin"), getTopRatedBlogPosts);

router
  .route("/blogPosts/topRatedPublishers")
  .get(checkAuth, getTopRatedPublishers);

router
  .route("/blogPosts/relatedPosts/:postId")
  .get(checkAuth, restriction("user", "admin"), getRelatedPosts);

router
  .route("/:postId")
  .get(checkAuth, restriction("user", "admin"), getPost)
  .post(checkAuth, restriction("user"), sharePost)
  .delete(checkAuth, restriction("user", "admin"), deletePost)
  .patch(
    checkAuth,
    restriction("user"),
    uploadPostMediaFiles("images"),
    resizeAndOptimiseMedia,
    updatePost
  );

router
  .route("/")
  .post(
    checkAuth,
    restriction("user"),
    uploadPostMediaFiles("images"),
    resizeAndOptimiseMedia,
    createPost
  );

export default router;
