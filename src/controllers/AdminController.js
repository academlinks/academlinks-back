import { asyncWrapper } from "../lib/asyncWrapper.js";
import AppError from "../lib/AppError.js";
import asignToken from "../lib/asignToken.js";

import API_Features from "../lib/API_Features.js";

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

  res.status(200).json({ accessToken });
});

export const getUserLabels = asyncWrapper(async function (req, res, next) {
  const docQuery = new API_Features(User.find(), req.query)
    .pagination()
    .selectFields(
      "profileImg firstName lastName userName email birthDate gender createdAt"
    )
    .filter();
  // .sort();

  const { data, docCount } = await docQuery.execute();

  const resBody = {
    users: data,
  };

  if (docCount.isRequested) resBody.docCount = docCount.count;

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
  const { filter } = req.query;

  const query = {};
  if (filter)
    query.aproved = filter === "aproved" ? true : filter === "new" ? false : "";

  const registrations = await Registration.find(query).select(
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
