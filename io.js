import { io } from "./index.js";
import OnlineUsers from "./src/models/OnLineUsers.js";

async function addOnlineUser(onlineUser) {
  try {
    const onlineUserId = onlineUser.userId;
    const isAlreadyActive = await OnlineUsers.findOne({ userId: onlineUserId });

    if (isAlreadyActive) {
      await OnlineUsers.findOneAndUpdate(
        { userId: onlineUserId },
        { socketId: onlineUser.socketId },
        { new: true }
      );
    } else {
      await OnlineUsers.create(onlineUser);
    }
  } catch (error) {
    console.log(error);
  }
}

async function removeOnlineUser(socketId) {
  try {
    await OnlineUsers.findOneAndDelete({ socketId });
  } catch (error) {
    console.log(error);
  }
}

export function socket() {
  io.on("connection", (socket) => {
    socket.on("userConnection", async (data) => {
      await addOnlineUser({
        userId: data._id,
        userName:data.userName,
        email:data.email,
        image:data.image,
        socketId: socket.id,
      });
    });

    socket.on("disconnect", async () => {
      await removeOnlineUser(socket.id);
    });
  });
}
