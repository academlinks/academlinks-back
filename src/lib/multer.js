const multer = require("multer");
const sharp = require("sharp");
const AppError = require("./AppError.js");

// UPLOAD MEDIA
function createDestination(destination = "public/images", storage) {
  const mediaStorage = {
    diskStorage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, destination),
      filename: (req, file, cb) =>
        cb(null, `user-${req.user.id}-${Date.now()}-${file.originalname}`),
    }),
    memoryStorage: multer.memoryStorage(),
  };

  return mediaStorage[storage];
}

function mediaFillter(req, file, cb) {
  const ext = file.mimetype;
  if (ext.startsWith("image")) cb(null, true);
  else cb(new AppError(400, "file is not the image"), false);
}

const media = (params) =>
  multer({
    storage: createDestination(
      params.destination || undefined,
      params.storage || "diskStorage"
    ),
    fileFilter: mediaFillter,
  })[[params.upload]](params.filename);

/**
 * @param {*} params {storage, destination, upload, filename}
 * @storage must be the String 'diskStorage' || 'memoryStorage'. By Default is 'diskStorage'
 * @destination must be the String (is path of static files). By Default is 'public/images'
 * @upload must be the String (is methods of multer : single or any).
 * @filename must be the String (is field name of form)
 * @returns
 */
exports.uploadMedia = (params) => media(params);

// EDIT AND RESIZE MEDIA
/**
 * @param {} params {multy, width, height}
 * @param multy must be the Boolean true || false -- is true if specific route waits for multiple files at time, if route waits for single file define as false
 * @param resize must be the Boolean true || false
 * @param width must be The Number (width of file to resize). By Default is 500
 * @param height must be The Number (height of file to resize). By Default is undefined
 * @returns
 */
exports.editMedia = (params) => async (req, res, next) => {
  const key = params.multy ? "files" : "file";
  const destination = params.destination || "public/images";
  // ? "../../../../../public/images"
  // : "../../../../../public/images";
  // || process.env.STATIC_FILE_DESTINATION;

  if (!req[key]) return next();

  const copyrightedData = params.multy ? [...req[key]] : req[key];

  const isArray = Array.isArray(copyrightedData);

  async function editor({ file, width, height, fileName }) {
    await sharp(file)
      .resize(width || 500, height || undefined)
      .toFormat("webp")
      .webp({ quality: 90 })
      .toFile(`${destination}/${fileName}`);
  }

  async function writeOriginal({ file, fileName }) {
    await sharp(file)
      .toFormat("webp")
      .webp({ quality: 90 })
      .toFile(`${destination}/${fileName}`);
    // .toFile(fileName);
  }

  const currentDate = Date.now();

  function generateFileName(index) {
    const mainStr = `user-${req.user.id}-${currentDate}`;
    const widthStr = `${
      index.startsWith("original") ? "" : params?.width || "500"
    }`;
    const heightStr = `${
      index.startsWith("original")
        ? ""
        : params?.height
        ? `x${params?.height}`
        : "xAuto"
    }`;
    const indexStr = `${index.startsWith("original") ? index : ""}`;
    ////////////////////////////////////////////////////////////////////////
    const fileName = `${mainStr}--${widthStr}${heightStr}${indexStr}.webp`;

    return { fileName };
  }

  if (!isArray) {
    const { fileName: nameForOrigin } = generateFileName("original");
    const { fileName } = params.resize
      ? generateFileName(`1`)
      : { fileName: "" };

    await writeOriginal({
      file: copyrightedData.buffer,
      fileName: nameForOrigin,
    });

    params.resize &&
      (await editor({
        file: copyrightedData.buffer,
        width: params?.width,
        height: params?.height,
        fileName,
      }));

    if (params.resize) req.x500 = fileName;
    req.xOriginal = nameForOrigin;
  } else if (isArray) {
    const x500 = [];
    const xOriginal = [];

    await Promise.all(
      copyrightedData.map(async (file, index) => {
        const { fileName: nameForOrigin } = generateFileName(
          `original-${index}`
        );
        const { fileName } = params.resize
          ? generateFileName(`${index + 1}`)
          : { fileName: "" };

        await writeOriginal({
          file: file.buffer,
          fileName: nameForOrigin,
        });

        params.resize &&
          (await editor({
            file: file.buffer,
            width: params?.width,
            height: params?.height,
            fileName,
          }));

        if (params.resize) x500.push(fileName);
        xOriginal.push(nameForOrigin);
      })
    );

    if (params.resize) req.x500 = x500;
    req.xOriginal = xOriginal;
  }

  next();
};
const t = "opt/render/project/src/public/images"