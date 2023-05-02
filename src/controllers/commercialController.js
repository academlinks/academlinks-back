const { asyncWrapper } = require("../lib");
const { Commercials } = require("../models");

exports.getCommercials = asyncWrapper(async function (req, res, next) {
  const { location } = req.query;

  const commercials = await Commercials.find({
    "location.page": location,
    validUntil: { $gte: Date.now() },
  }).select("isLinkable link media location");

  res.status(200).json(commercials);
});
