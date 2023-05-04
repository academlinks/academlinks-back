const { io } = require("./index");
const { IO } = require("./src/lib");

io.on(IO.IO_PLACEHOLDERS.connection, (socket) => {
  socket.on(IO.IO_PLACEHOLDERS.user_connection, async (data) => {
    await IO.addOnlineUser({
      userId: data._id,
      socketId: socket.id,
      userName: data.userName,
      email: data.email,
      image: data.image,
    });
  });

  socket.on(IO.IO_PLACEHOLDERS.user_disconnection, async () => {
    await IO.removeOnlineUser(socket.id);
  });

  socket.on(IO.IO_PLACEHOLDERS.disconnect, async () => {
    await IO.removeOnlineUser(socket.id);
  });
});
