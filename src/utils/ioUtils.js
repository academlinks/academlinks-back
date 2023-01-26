const OnlineUsers = require("../models/OnLineUsers.js");

exports.useSocket = async function (req, { adressatId, operationName, data }) {
  const io = await req.app.get("socket");

  const isOnlineAdressat = await OnlineUsers.findOne({ userId: adressatId });

  if (!isOnlineAdressat) return;

  io.to(isOnlineAdressat.socketId).emit(`${operationName}`, data);
};

exports.useLazySocket = async function (req) {
  const io = await req.app.get("socket");

  return async function sender({ adressatId, operationName, data }) {
    const isOnlineAdressat = await OnlineUsers.findOne({ userId: adressatId });

    if (!isOnlineAdressat) return;

    io.to(isOnlineAdressat.socketId).emit(`${operationName}`, data);
  };
};

exports.socket_name_placeholders = {
  // FOR BOTH
  connection: "connection",
  disconnect: "disconnect",
  userConnection: "user_connection",
  userDisconnection: "user_disconnection",
  // FOR ADMIN
  newUserIsRegistered: "new_user_is_registered",
  userChangeEmail: "admin_change_email_notify",
  // FOR USERS
  receiveNewFriendRequest: "receive_new_friend_request",
  receiveNewNotification: "receive_new_notification",
  receiveNewMessage: "receive_new_message",
  messageIsRead: "receive_message_isRead",
};
