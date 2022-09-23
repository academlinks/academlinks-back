import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import User from '../models/User.js';

export const sendFriendRequest = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId === currUser.id) return next(new AppError(400, 'please provide us valid user id'));

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(userId);

  if (!adressatUser) return next(new AppError(404, 'user does not exists'));

  adressatUser.pendingRequests.push({ adressat: currUser.id });
  user.sentRequests.push({ adressat: adressatUser._id });

  await user.save();
  await adressatUser.save();

  res.status(200).json({ sent: true });
});

export const cancelFriendRequest = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId === currUser.id) return next(new AppError(400, 'please provide us valid user id'));

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(userId);

  adressatUser.pendingRequests = adressatUser.pendingRequests.filter(
    (request) => request.adressat.toString() !== currUser.id
  );

  user.sentRequests = user.sentRequests.filter(
    (request) => request.adressat.toString() !== adressatUser._id.toString()
  );

  await user.save();
  await adressatUser.save();

  res.status(200).json({ canceled: true });
});

export const deleteFriendRequest = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId === currUser.id) return next(new AppError(400, 'please provide us valid user id'));

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(userId);

  adressatUser.sentRequests = adressatUser.sentRequests.filter(
    (request) => request.adressat.toString() !== currUser.id
  );

  user.pendingRequests = user.pendingRequests.filter(
    (request) => request.adressat.toString() !== adressatUser._id.toString()
  );

  await user.save();
  await adressatUser.save();

  res.status(200).json({ deleted: true });
});

export const confirmFriendRequest = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId === currUser.id) return next(new AppError(400, 'please provide us valid user id'));

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(userId);

  if (!adressatUser) return next(new AppError(404, 'user does not exists'));

  adressatUser.sentRequests = adressatUser.sentRequests.filter(
    (request) => request.adressat.toString() !== currUser.id
  );

  user.pendingRequests = user.pendingRequests.filter(
    (request) => request.adressat.toString() !== adressatUser._id.toString()
  );

  user.friends.push({ friend: adressatUser._id });
  adressatUser.friends.push({ friend: currUser.id });

  await user.save();
  await adressatUser.save();

  res.status(200).json({ confirmed: true });
});

export const deleteFriend = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId === currUser.id) return next(new AppError(400, 'please provide us valid user id'));
  console.log(userId);
  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(userId);

  if (!adressatUser) return next(new AppError(404, 'user does not exists'));

  adressatUser.friends = adressatUser.friends.filter((fr) => fr.friend.toString() !== currUser.id);

  user.friends = user.friends.filter((fr) => fr.friend.toString() !== adressatUser._id.toString());

  await user.save();
  await adressatUser.save();

  res.status(200).json({ deleted: true });
});

export const getUserFriends = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const userFriends = await User.findById(userId).select('friends').populate({
    path: 'friends.friend',
    select: 'userName profileImg',
  });

  res.status(200).json(userFriends.friends);
});

export const getUserPendingRequest = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorised for this operation'));

  const pendingRequests = await User.findById(userId).select('pendingRequests').populate({
    path: 'pendingRequests.adressat',
    select: 'userName profileImg',
  });

  res.status(200).json(pendingRequests.pendingRequests);
});

export const getUserSentRequest = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorised for this operation'));

  const sentRequests = await User.findById(userId).select('sentRequests').populate({
    path: 'sentRequests.adressat',
    select: 'userName profileImg',
  });

  res.status(200).json(sentRequests.sentRequests);
});
