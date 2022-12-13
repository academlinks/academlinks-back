import OnlineUsers from "../models/OnLineUsers.js";

export async function useSocket(req, { adressatId, operationName, data }) {
  const io = await req.app.get("socket");

  const isOnlineAdressat = await OnlineUsers.findOne({ userId: adressatId });

  if (!isOnlineAdressat) return;

  io.to(isOnlineAdressat.socketId).emit(`${operationName}`, data);
}

export async function useLazySocket(req) {
  const io = await req.app.get("socket");

  return async function sender({ adressatId, operationName, data }) {
    const isOnlineAdressat = await OnlineUsers.findOne({ userId: adressatId });

    if (!isOnlineAdressat) return;

    io.to(isOnlineAdressat.socketId).emit(`${operationName}`, data);
  };
}

export const socket_name_placeholders = {
  newNotification: "receive_new_notification",
  newMessage: "receive_new_message",
  messageIsRead: "receive_message_isRead",
  receiveNewFriendRequest: "receive_new_friend_request",
};
