import { asyncWrapper } from "../lib/asyncWrapper.js";
import AppError from "../lib/AppError.js";
import asignToken from "../lib/asignToken.js";

import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Registration from "../models/Registration.js";

export const logIn = asyncWrapper(async function (req, res, next) {
  const { userName, password } = req.body;

  const admin = await Admin.findOne({ userName }).select("+password");

  const validPassword = await admin.checkPassword(password, admin.password);

  if (!admin || !validPassword)
    return next(new AppError(404, "incorect username or password"));

  admin.password = undefined;

  const { accessToken } = await asignToken(res, admin);

  res.status(200).json({ ...admin._doc, accessToken });
});

export const getUserLabels = asyncWrapper(async function (req, res, next) {
  const { hasMore, limit, page } = req.query;
  console.log({ hasMore, limit, page });

  let docCount;
  if (hasMore) User.count();

  const users = await User.find().select("profileImg userName email birthDate");

  const resBody = {
    users,
  };

  if (hasMore) resBody.count = docCount;

  res.status(200).json(resBody);
});

export const getUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;

  const userInfo = await User.findById(userId).select(
    "userName email createdAt education birthDate currentLivingPlace workplace gender from profileImg"
  );

  if (!userInfo) return next(new AppError(404, "user does not exists"));

  res.status(200).json(userInfo);
});

export const getRegistrationLabels = asyncWrapper(async function (
  req,
  res,
  next
) {
  const registrations = await Registration.find().select(
    "userName email gender"
  );

  res.status(200).json(registrations);
});

export const getRegistration = asyncWrapper(async function (req, res, next) {
  const { registrationId } = req.params;

  const registration = await Registration.findById(registrationId);

  if (!registration)
    return next(new AppError(404, "there are no such a request"));

  res.status(200).json(registration);
});

async function createAdmin() {
  const admin = new Admin({
    userName: "admin_mark",
    password: "sh12mk3tt_7xxAdmin",
  });

  await admin.save();
}
