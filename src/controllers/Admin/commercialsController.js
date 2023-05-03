const { Commercials } = require("../../models");
const AdminUtils = require("../../utils/admin/AdminUtils");
const EmailUtils = require("../../utils/email/EmailUtils");
const { AppError, asyncWrapper, Upload } = require("../../lib");
const { COMMERCIAL_UPLOAD_DESTINATION } = require("../../config");

const upload = new Upload({
  multy: false,
  upload: "single",
  storage: "memoryStorage",
  destination: COMMERCIAL_UPLOAD_DESTINATION,
});

exports.uploadCommercialMediaFiles = (imageName) =>
  upload.uploadMedia({
    filename: imageName,
  });

exports.resizeAndOptimiseMedia = upload.editMedia();

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
    newCommercial.media = AdminUtils.generateFileName({
      fileName: req.xOriginal,
    });
  }

  await Commercials.create(newCommercial);

  res.status(201).json({ created: true });
});

exports.deleteCommercial = asyncWrapper(async function (req, res, next) {
  const { commercialId } = req.params;

  const commercial = await Commercials.findById(commercialId);
  if (!commercial) return next(new AppError(404, "commercial does not exists"));

  await AdminUtils.unlinkFile({
    media: commercial.media,
    location: "commercials",
  });

  await commercial.delete();

  res.status(204).json({ deleted: true });
});

exports.updateCommercial = asyncWrapper(async function (req, res, next) {
  const { commercialId } = req.params;
  const body = req.body;

  const comercial = await Commercials.findById(commercialId);
  if (!comercial) return next(new AppError(404, "commercial does not exists"));

  const { newMediaAdress } = await AdminUtils.manageCommercialMediaOnUpdate({
    req,
  });
  if (newMediaAdress) body.media = newMediaAdress;

  Object.keys(body).forEach((key) => (comercial[key] = body[key]));

  await comercial.save();

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

  await EmailUtils.sendManualEmail({ adressat: email, subject, text });

  res.status(201).json({ emailIsSent: true });
});
