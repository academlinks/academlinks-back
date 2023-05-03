const Utils = require("../Utils");

class AdminUtils extends Utils {
  async manageCommercialMediaOnUpdate({ req }) {
    try {
      let newMediaAdress;
      const media = req.body.media;

      if (req.file && req.xOriginal) {
        await this.unlinkFile({ location: "commercials", media });
        newMediaAdress = this.generateFileName({
          location: "commercials",
          fileName: req.xOriginal,
        });
      }

      return { newMediaAdress };
    } catch (error) {
      throw new Error(
        "There was an error during deleting commercial media files."
      );
    }
  }
}

module.exports = new AdminUtils();
