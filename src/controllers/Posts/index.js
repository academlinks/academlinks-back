module.exports = {
  resizeAndOptimiseMedia: require("./postController").resizeAndOptimiseMedia,
  uploadPostMediaFiles: require("./postController").uploadPostMediaFiles,
  createPost: require("./postController").createPost,
  deletePost: require("./postController").deletePost,
  updatePost: require("./postController").updatePost,
  getPost: require("./postController").getPost,
  sharePost: require("./postController").sharePost,
  savePost: require("./postController").savePost,
  changePostAudience: require("./postController").changePostAudience,
  reactOnPost: require("./postController").reactOnPost,
  getPostComments: require("./postController").getPostComments,
  isUserPost: require("./postController").isUserPost,

  getBlogPost: require("./blogPostController").getBlogPost,
  getBlogPosts: require("./blogPostController").getBlogPosts,
  getTopRatedBlogPosts: require("./blogPostController").getTopRatedBlogPosts,
  getTopRatedPublishers: require("./blogPostController").getTopRatedPublishers,
  getRelatedPosts: require("./blogPostController").getRelatedPosts,

  reviewTaggedPosts: require("./tagsAndVisibilityController").reviewTaggedPosts,
  removeTagFromPost: require("./tagsAndVisibilityController").removeTagFromPost,
  addPostToProfile: require("./tagsAndVisibilityController").addPostToProfile,
  hidePostFromProfile: require("./tagsAndVisibilityController")
    .hidePostFromProfile,
};
