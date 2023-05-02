const onComment = require("./onComment");
const onPost = require("./onPost");
const onFriendRequest = require("./onFriendRequest");

module.exports = {
  OnCommentNotification: onComment.OnCommentNotification,
  OnPostNotification: onPost.OnPostNotification,
  OnRequestNotification: onFriendRequest.OnRequestNotification,
};
