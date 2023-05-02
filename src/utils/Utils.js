const {
  CLIENT_UPLOAD_DESTINATION,
  COMMERCIAL_STATIC_URL_ROOT,
  CLIENT_STATIC_URL_ROOT,
  CONSTANT_ASSETS,
} = require("../config");
const fs = require("fs");
const { promisify } = require("util");

class Utils {
  constructor() {
    this.unlink = promisify(fs.unlink);
    this.CLIENT_UPLOAD_DESTINATION = CLIENT_UPLOAD_DESTINATION;
    this.COMMERCIAL_STATIC_URL_ROOT = COMMERCIAL_STATIC_URL_ROOT;
    this.CLIENT_STATIC_URL_ROOT = CLIENT_STATIC_URL_ROOT;
    this.CONSTANT_ASSETS = CONSTANT_ASSETS;
  }

  async unlinkFile({ media, destination = this.CLIENT_UPLOAD_DESTINATION }) {
    try {
      const STATIC_ROOT = destination.endsWith("uploads/")
        ? CLIENT_STATIC_URL_ROOT
        : destination.endsWith("commercials/")
        ? COMMERCIAL_STATIC_URL_ROOT
        : "";

      const originalFileName = media.replace(STATIC_ROOT, "");

      const path = `${destination}${originalFileName}`;
      const exists = fs.existsSync(path);

      if (
        exists &&
        !this.CONSTANT_ASSETS.some((asset) => media.includes(asset))
      )
        await this.unlink(path);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Utils;
