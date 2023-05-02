const { io } = require("./index");
const { OnLineUsers } = require("./src/models");
const { IO_PLACEHOLDERS } = require("./src/config");

async function addOnlineUser(onlineUser) {
  try {
    const onlineUserId = onlineUser.userId;
    const isAlreadyActive = await OnLineUsers.findOne({ userId: onlineUserId });

    if (isAlreadyActive) {
      await OnLineUsers.findOneAndUpdate(
        { userId: onlineUserId },
        { socketId: onlineUser.socketId },
        { new: true }
      );
    } else {
      await OnLineUsers.create(onlineUser);
    }
  } catch (error) {
    console.log(error);
  }
}

async function removeOnlineUser(socketId) {
  try {
    await OnLineUsers.findOneAndDelete({ socketId });
  } catch (error) {
    console.log(error);
  }
}

io.on(IO_PLACEHOLDERS.connection, (socket) => {
  socket.on(IO_PLACEHOLDERS.userConnection, async (data) => {
    await addOnlineUser({
      userId: data._id,
      socketId: socket.id,
      userName: data.userName,
      email: data.email,
      image: data.image,
    });
  });

  socket.on(IO_PLACEHOLDERS.userDisconnection, async () => {
    await removeOnlineUser(socket.id);
  });

  socket.on(IO_PLACEHOLDERS.disconnect, async () => {
    await removeOnlineUser(socket.id);
  });
});
