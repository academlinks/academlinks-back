const multer = require("multer");
const sharp = require("sharp");
const AppError = require("./AppError");
const { CLIENT_UPLOAD_DESTINATION } = require("../config");

class Media {
  constructor({
    upload = "any",
    storage = "diskStorage",
    destination = CLIENT_UPLOAD_DESTINATION,
    multy = true,
    quality = 90,
    format = "webp",
    resize = false,
    width = 500,
    height = undefined,
  }) {
    // multer params
    this.upload = upload;
    this.storage = storage;
    this.destination = destination;

    // sharp params
    this.multy = multy;
    this.quality = quality;
    this.format = format;
    this.resize = resize;
    this.width = width;
    this.height = height;
  }

  uploadMedia({ filename }) {
    return this.multerConfig({
      filename,
      destination: this.destination,
      upload: this.upload,
      storage: this.storage,
    });
  }

  multerConfig({ filename, destination, upload, storage }) {
    return multer({
      storage: this.createDestination({ destination, storage }),
      fileFilter: this.mediaFillter,
    })[[upload]](filename);
  }

  createDestination({ destination, storage }) {
    const filename = ({ req, file }) =>
      `user-${req.user.id}-${Date.now()}-${file.originalname}`;

    const mediaStorage = {
      diskStorage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, destination),
        filename: (req, file, cb) => cb(null, filename({ req, file })),
      }),
      memoryStorage: multer.memoryStorage(),
    };

    return mediaStorage[storage];
  }

  mediaFillter(req, file, cb) {
    const ext = file.mimetype;
    if (ext.startsWith("image")) cb(null, true);
    else cb(new AppError(400, "file is not the image"), false);
  }

  editMedia() {
    return async (req, res, next) => {
      const key = this.multy ? "files" : "file";

      if (!req[key]) return next();

      const media = key === "files" ? [...req[key]] : req[key];

      const isArray = Array.isArray(media);

      if (!isArray) {
        const { fileName, editedFileName } = this.generateFileName({
          userId: req.user.id,
        });

        await this.writeOnDisk({
          file: media.buffer,
          fileName,
          editedFileName,
        });

        if (this.resize) req.x500 = editedFileName;
        req.xOriginal = nameForOrigin;
      } else if (isArray) {
        const x500 = [];
        const xOriginal = [];

        await Promise.all(
          media.map(async (file, index) => {
            const { fileName, editedFileName } = this.generateFileName({
              userId: req.user.id,
              sufix: index + 1,
            });

            await this.writeOnDisk({
              file: file.buffer,
              fileName,
              editedFileName,
            });

            if (this.resize) x500.push(editedFileName);

            xOriginal.push(fileName);
          })
        );

        if (this.resize) req.x500 = x500;
        req.xOriginal = xOriginal;
      }

      next();
    };
  }

  async writeOnDisk({ file, fileName, editedFileName }) {
    await sharp(file)
      .toFormat(this.format)
      .webp({ quality: this.quality })
      .toFile(`${this.destination}/${fileName}`);

    if (this.resize) this.edit({ file, fileName: editedFileName });
  }

  async edit({ file, fileName }) {
    await sharp(file)
      .resize(this.width, this.height)
      .toFormat(this.format)
      .webp({ quality: this.quality })
      .toFile(`${this.destination}/${fileName}`);
  }

  generateFileName({ userId, sufix = 1 }) {
    const currentDate = Date.now();
    const prefix = `user-${userId}-${currentDate}`;

    const widthStr = !this.resize ? "" : this.width;
    const heightStr = !this.resize
      ? ""
      : this.height
      ? `x${this.height}`
      : "xAuto";

    const sufixStr = "original";
    const sufixEditedStr = `resized-${sufix}`;

    const fileName = (sfx) => `${prefix}--${widthStr}${heightStr}${sfx}.webp`;

    return {
      fileName: fileName(sufixStr),
      editedFileName: fileName(sufixEditedStr),
    };
  }
}

module.exports = Media;
