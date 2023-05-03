const { OnLineUsers } = require("../../models");
const { IO_PLACEHOLDERS } = require("../../config");

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
}

module.exports = IO;
