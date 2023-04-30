const fs = require("fs");
const { promisify } = require("util");

const asyncWrapper = require("../../lib/asyncWrapper.js");
const AppError = require("../../lib/AppError.js");
const { getServerHost } = require("../../lib/getOrigins.js");
const Email = require("../../lib/sendEmail.js");
const { uploadMedia, editMedia } = require("../../lib/multer.js");

const { Commercials } = require("../../models");

exports.resizeAndOptimiseMedia = editMedia({
  multy: false,
  resize: false,
  destination: "public/images/commercials",
});

exports.uploadCommercialMediaFiles = (imageName) =>
  uploadMedia({
    storage: "memoryStorage",
    destination: "public/images/commercials",
    upload: "single",
    filename: imageName,
  });

exports.getCommercials = asyncWrapper(async function (req, res, next) {
  const { all, outdated, active } = req.query;

  const clientQuery = {
    all: all && JSON.parse(all),
    outdated: outdated && JSON.parse(outdated),
    active: active && JSON.parse(active),
  };

  const dbQuery = {};

  if (clientQuery.outdated) dbQuery.validUntil = { $lt: new Date() };
  else if (clientQuery.active) dbQuery.validUntil = { $gte: new Date() };

  const commercials = await Commercials.find(dbQuery);

  res.status(200).json(commercials);
});

exports.getCommercial = asyncWrapper(async function (req, res, next) {
  const { commercialId } = req.params;

  const commercial = await Commercials.findById(commercialId);

  if (!commercial) return next(new AppError(404, "commercial does not exists"));

  res.status(200).json(commercial);
});

exports.addCommercial = asyncWrapper(async function (req, res, next) {
  const commercialBody = req.body;

  const newCommercial = {
    ...commercialBody,
  };

  if (req.file) {
    newCommercial.media = `${getServerHost()}/commercials/${req.xOriginal}`;
  }

  await Commercials.create(newCommercial);

  res.status(201).json({ created: true });
});

exports.deleteCommercial = asyncWrapper(async function (req, res, next) {
  const { commercialId } = req.params;

  const commercial = await Commercials.findById(commercialId);
  if (!commercial) return next(new AppError(404, "commercial does not exists"));

  const commercialMedia = commercial.media;

  const deletion = promisify(fs.unlink);

  if (commercialMedia) {
    try {
      const originalFileName = commercialMedia.split("/")?.slice(4)[0];
      await deletion(`public/images/commercials/${originalFileName}`);
    } catch (error) {
      return next(
        new AppError(
          403,
          "something went wrong, cant't find and delete removed commercial media files which are attached to the commercial. Please report the problem or try again later"
        )
      );
    }
  }

  await commercial.delete();

  res.status(204).json({ deleted: true });
});

exports.updateCommercial = asyncWrapper(async function (req, res, next) {
  const { commercialId } = req.params;
  const body = req.body;

  const comerc = await Commercials.findById(commercialId);
  if (!comerc) return next(new AppError(404, "commercial does not exists"));

  const media = body.media;

  const deletion = promisify(fs.unlink);

  if (req.file && req.xOriginal) {
    try {
      const originalFileName = media.split("/")?.slice(4)[0];
      await deletion(`public/images/commercials/${originalFileName}`);
      body.media = `${getServerHost()}/commercials/${req.xOriginal}`;
    } catch (error) {
      return next(
        new AppError(
          403,
          "something went wrong, cant't find and delete removed commercial media files which are attached to the commercial. Please report the problem or try again later"
        )
      );
    }
  }

  Object.keys(body).forEach((key) => (comerc[key] = body[key]));

  await comerc.save();

  res.status(201).json({ updated: true });
});

exports.sendEmailToCommercialCustomer = asyncWrapper(async function (
  req,
  res,
  next
) {
  const { email, subject, text } = req.body;

  if (!email) return next(new AppError(404, "please provide us email"));

  const customer = await Commercials.findOne({ email });

  if (!customer)
    return next(new AppError(404, "customer with this email does not exists"));

  try {
    await new Email({
      adressat: email,
      subject,
      text,
    }).send({});
  } catch (error) {
    return next(
      new AppError(
        500,
        "There was an error sending the email. Try again later!"
      )
    );
  }

  res.status(201).json({ emailIsSent: true });
});