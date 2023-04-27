module.exports = {
  sendFriendRequest: require("./requestController").sendFriendRequest,
  cancelFriendRequest: require("./requestController").cancelFriendRequest,
  deleteFriendRequest: require("./requestController").deleteFriendRequest,
  confirmFriendRequest: require("./requestController").confirmFriendRequest,
  getUserPendingRequest: require("./requestController").getUserPendingRequest,
  getUserSentRequest: require("./requestController").getUserSentRequest,
  getPendingRequestsCount: require("./requestController")
    .getPendingRequestsCount,
  markPendingRequestsAsSeen: require("./requestController")
    .markPendingRequestsAsSeen,

  deleteFriend: require("./friendsController").deleteFriend,
  getUserFriends: require("./friendsController").getUserFriends,
};
