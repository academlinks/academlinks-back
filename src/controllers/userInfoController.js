import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import User from '../models/User.js';

export const getUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;

  const user = await User.findById(userId).select(
    'birthDate from currentLivingPlace createdAt workplace education gender email'
  );

  res.status(200).json(user);
});

export const addUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const data = req.body;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorizd for this operation'));

  const dataToAdd = Object.keys(data)[0];

  const availableUpdates = [
    'education',
    'workplace',
    'birthDate',
    'currentLivingPlace',
    'gender',
    'from',
  ];

  if (!availableUpdates.includes(dataToAdd))
    return next(new AppError(400, "can't perform this operation"));

  const user = await User.findById(userId).select(
    'birthDate from currentLivingPlace createdAt workplace education gender email'
  );

  if (dataToAdd === 'education' || dataToAdd === 'workplace')
    user[dataToAdd] = [...user[dataToAdd], data[dataToAdd]];
  else user[dataToAdd] = data[dataToAdd];

  await user.save();

  res.status(200).json(user);
});

export const updateUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const data = req.body;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorizd for this operation'));

  const dataToUpdate = Object.keys(data)[0];

  const availableUpdates = [
    'education',
    'workplace',
    'birthDate',
    'currentLivingPlace',
    'gender',
    'from',
  ];

  if (!availableUpdates.includes(dataToUpdate))
    return next(new AppError(400, "can't perform this operation"));

  const user = await User.findByIdAndUpdate(userId, data, { new: true }).select(
    'birthDate from currentLivingPlace createdAt workplace education gender email'
  );

  res.status(200).json(user);
});

export const deleteUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const data = req.body;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorizd for this operation'));

  const dataToDelete = Object.keys(data)[0];

  const availableDeletions = [
    'education',
    'workplace',
    'birthDate',
    'currentLivingPlace',
    'gender',
    'from',
  ];

  if (!availableDeletions.includes(dataToDelete))
    return next(new AppError(400, "can't perform this operation"));

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $unset: { [dataToDelete]: '' },
    },
    { new: true }
  ).select('birthDate from currentLivingPlace createdAt workplace education gender email');

  res.status(200).json(updatedUser);
});
