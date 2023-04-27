const AppError = require("../lib/AppError.js");
const asyncWrapper = require("../lib/asyncWrapper.js");

const { Commercials } = require("../models");

exports.getCommercials = asyncWrapper(async function (req, res, next) {
  const { location } = req.query;

  const commercials = await Commercials.find({
    "location.page": location,
    validUntil: { $gte: Date.now() },
  }).select("isLinkable link media location");

  res.status(200).json(commercials);
});
