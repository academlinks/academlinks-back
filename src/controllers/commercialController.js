const AppError = require("../lib/AppError.js");
const asyncWrapper = require("../lib/asyncWrapper.js");

const Commercial = require("../models/Commercials.js");

exports.getCommercials = asyncWrapper(async function (req, res, next) {
  const { location } = req.query;

  const commercials = await Commercial.find({
    "location.page": location,
    validUntil: { $gte: Date.now() },
  }).select("isLinkable link media location");

  res.status(200).json(commercials);
});
