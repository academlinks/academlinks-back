module.exports = {
  resizeAndOptimiseMedia: require("./userController").resizeAndOptimiseMedia,
  uploadUserProfileFile: require("./userController").uploadUserProfileFile,
  updateProfileImage: require("./userController").updateProfileImage,
  updateCoverImage: require("./userController").updateCoverImage,
  deleteUser: require("./userController").deleteUser,
  searchUsers: require("./userController").searchUsers,
  getUserProfile: require("./userController").getUserProfile,
  getBadges: require("./userController").getBadges,
  isFriend: require("./userController").isFriend,

  getProfilePosts: require("./profileAndFeedController").getProfilePosts,
  getPendingPosts: require("./profileAndFeedController").getPendingPosts,
  getHiddenPosts: require("./profileAndFeedController").getHiddenPosts,
  getUserFeed: require("./profileAndFeedController").getUserFeed,
  getBookmarks: require("./profileAndFeedController").getBookmarks,
};
