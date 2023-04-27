const asyncWrapper = require("../../lib/asyncWrapper.js");
const AppError = require("../../lib/AppError.js");

const { Registration } = require("../../models");

exports.getRegistrationLabels = asyncWrapper(async function (req, res, next) {
  const { filter } = req.query;

  const query = {};
  if (filter)
    query.aproved = filter === "aproved" ? true : filter === "new" ? false : "";

  const registrations = await Registration.find(query)
    .select("userName email gender")
    .sort({ createdAt: -1 });

  res.status(200).json(registrations);
});

exports.getRegistration = asyncWrapper(async function (req, res, next) {
  const { registrationId } = req.params;

  const registration = await Registration.findById(registrationId);

  if (!registration)
    return next(new AppError(404, "there are no such a request"));

  res.status(200).json(registration);
});
