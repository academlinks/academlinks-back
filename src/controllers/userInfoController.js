import AppError from "../lib/AppError.js";
import { asyncWrapper } from "../lib/asyncWrapper.js";

import User from "../models/User.js";

export const getUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;

  const user = await User.findById(userId).select(
    "birthDate from currentLivingPlace createdAt currentWorkplace workplace education gender email"
  );

  res.status(200).json(user);
});

export const addUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const data = req.body;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorizd for this operation"));

  const dataToAdd = Object.keys(data)[0];

  const availableUpdates = [
    "education",
    "workplace",
    "birthDate",
    "currentLivingPlace",
    "gender",
    "from",
    "currentWorkplace"
  ];

  if (!availableUpdates.includes(dataToAdd))
    return next(new AppError(400, "can't perform this operation"));

  let user;

  if (["education", "workplace"].includes(dataToAdd))
    user = await User.findByIdAndUpdate(
      userId,
      { $push: { [dataToAdd]: data[dataToAdd] } },
      { new: true, runValidators: true }
    );
  else
    user = await User.findByIdAndUpdate(userId, { $set: data }, { new: true });

  res.status(200).json(user[dataToAdd]);
});

export const updateUserNestedInfo = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;
  const { userId, field, docId } = req.params;

  const data = req.body;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorizd for this operation"));

  const availableUpdates = ["education", "workplace"];

  if (!availableUpdates.includes(field))
    return next(new AppError(400, "can't perform this operation"));

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { [`${field}.$[el]`]: data } },
    { new: true, runValidators: true, arrayFilters: [{ "el._id": docId }] }
  ).select("workplace education");

  res.status(200).json(user[field]);
});

export const deleteUserInfo = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId, field } = req.params;

  if (currUser.role !== "admin" && userId !== currUser.id)
    return next(new AppError(403, "you are not authorizd for this operation"));

  const availableDeletions = [
    "birthDate",
    "currentLivingPlace",
    "gender",
    "from",
  ];

  if (!availableDeletions.includes(field))
    return next(new AppError(400, "can't perform this operation"));

  await User.findByIdAndUpdate(
    userId,
    {
      $unset: { [field]: "" },
    },
    { new: true }
  );

  res.status(204).json({ deleted: true });
});

export const deleteNestedUserInfo = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;
  const { userId, field, docId } = req.params;

  if (currUser.role !== "admin" && userId !== currUser.id)
    return next(new AppError(403, "you are not authorizd for this operation"));

  const availableDeletions = ["workplace", "education"];

  if (!availableDeletions.includes(field))
    return next(new AppError(400, "can't perform this operation"));

  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { [field]: { _id: docId } } },
    { new: true }
  ).select("workplace education");

  res.status(200).json(user[field]);
});
