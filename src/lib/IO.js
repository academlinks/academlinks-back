const { OnLineUsers } = require("../models");
const { IO_PLACEHOLDERS } = require("../config");

class IO {
  constructor() {
    this.IO_PLACEHOLDERS = IO_PLACEHOLDERS;
  }

  async useLazySocket(req) {
    try {
      const io = await req.app.get("socket");

      return async function sender({ adressatId, operationName, data }) {
        const isOnlineAdressat = await OnLineUsers.findOne({
          userId: adressatId,
        });

        if (!isOnlineAdressat) return;

        io.to(isOnlineAdressat.socketId).emit(`${operationName}`, data);
      };
    } catch (error) {
      throw error;
    }
  }

  async useSocket(req, { adressatId, operationName, data }) {
    try {
      const io = await req.app.get("socket");

      const isOnlineAdressat = await OnLineUsers.findOne({
        userId: adressatId,
      });

      if (!isOnlineAdressat) return;

      io.to(isOnlineAdressat.socketId).emit(`${operationName}`, data);
    } catch (error) {
      throw error;
    }
  }

  async addOnlineUser(onlineUser) {
    try {
      const onlineUserId = onlineUser.userId;
      const isAlreadyActive = await OnLineUsers.findOne({
        userId: onlineUserId,
      });

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

  async removeOnlineUser(socketId) {
    try {
      await OnLineUsers.findOneAndDelete({ socketId });
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = new IO();
