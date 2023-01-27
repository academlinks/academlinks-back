const io = require("./index");
const OnlineUsers = require("./src/models/OnLineUsers");
const { socket_name_placeholders } = require("./src/utils/ioUtils");

exports.addOnlineUser = async function (onlineUser) {
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
};

exports.removeOnlineUser = async function (socketId) {
  try {
    await OnlineUsers.findOneAndDelete({ socketId });
  } catch (error) {
    console.log(error);
  }
};

io.on(socket_name_placeholders.connection, (socket) => {
  socket.on(socket_name_placeholders.userConnection, async (data) => {
    await addOnlineUser({
      userId: data._id,
      socketId: socket.id,
      userName: data.userName,
      email: data.email,
      image: data.image,
    });
  });

  socket.on(socket_name_placeholders.userDisconnection, async () => {
    await removeOnlineUser(socket.id);
  });

  socket.on(socket_name_placeholders.disconnect, async () => {
    await removeOnlineUser(socket.id);
  });
});
