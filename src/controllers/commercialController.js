import AppError from "../lib/AppError.js";
import { asyncWrapper } from "../lib/asyncWrapper.js";

import Commercial from "../models/Commercials.js";

export const getCommercials = asyncWrapper(async function (req, res, next) {
  const { location } = req.query;

  const commercials = await Commercial.find({
    "location.page": location,
    validUntil: { $gte: Date.now() },
  }).select("isLinkable link media location");

  res.status(200).json(commercials);
});
