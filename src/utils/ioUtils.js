import OnlineUsers from "../models/OnLineUsers.js";

export async function useSocket(req, { adressatId, operationName, data }) {
  const io = await req.app.get("socket");

  const isOnlineAdressat = await OnlineUsers.findOne({ userId: adressatId });

  if (!isOnlineAdressat) return;

  io.to(isOnlineAdressat.socketId).emit(`${operationName}`, data);
}
