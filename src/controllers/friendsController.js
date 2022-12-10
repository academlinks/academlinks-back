import mongoose from "mongoose";
import AppError from "../lib/AppError.js";
import { asyncWrapper } from "../lib/asyncWrapper.js";

import User from "../models/User.js";

import { controllUserExistence } from "../utils/friendsControllerUtils.js";
import { controllFriendRequestNotification } from "../utils/notificationControllerUtils.js";

export const sendFriendRequest = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { user, adressatUser } = await controllUserExistence({ req, next });

  adressatUser.pendingRequests.push({ adressat: currUser.id });
  user.sentRequests.push({ adressat: adressatUser._id });

  await user.save();
  await adressatUser.save();

  await controllFriendRequestNotification({
    currUser: user._id.toString(),
    adressat: adressatUser._id.toString(),
    send: true,
  });

  res.status(200).json({ sent: true });
});

export const cancelFriendRequest = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;

  const { user, adressatUser } = await controllUserExistence({ req, next });

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

export const deleteFriendRequest = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;

  const { user, adressatUser } = await controllUserExistence({ req, next });

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

export const confirmFriendRequest = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;

  const { user, adressatUser } = await controllUserExistence({ req, next });

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

  await controllFriendRequestNotification({
    currUser: user._id.toString(),
    adressat: adressatUser._id.toString(),
    confirm: true,
  });

  res.status(200).json({ confirmed: true });
});

export const deleteFriend = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { user, adressatUser } = await controllUserExistence({ req, next });

  adressatUser.friends = adressatUser.friends.filter(
    (fr) => fr.friend.toString() !== currUser.id
  );

  user.friends = user.friends.filter(
    (fr) => fr.friend.toString() !== adressatUser._id.toString()
  );

  await user.save();
  await adressatUser.save();

  res.status(200).json({ deleted: true });
});

export const getUserFriends = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const currUserFriendsBlock = await User.findById(currUser.id).select(
    "friends"
  );
  const currUserFriendsArr = currUserFriendsBlock.friends.map(
    (friend) => friend.friend
  );

  const userFriends = await User.aggregate([
    {
      $match: {
        role: "user",
        friends: { $elemMatch: { friend: mongoose.Types.ObjectId(userId) } },
      },
    },
    {
      $unwind: "$friends",
    },
    {
      $group: {
        _id: "$_id",
        friendsArr: { $push: "$friends.friend" },
        userName: { $first: "$userName" },
        profileImg: { $first: "$profileImg" },
      },
    },
    {
      $addFields: {
        matched: { $setIntersection: [currUserFriendsArr, "$friendsArr"] },
      },
    },
    {
      $addFields: {
        muntuals: { $size: "$matched" },
      },
    },
    {
      $project: {
        muntuals: 1,
        userName: 1,
        profileImg: 1,
      },
    },
    {
      $sort: { userName: 1 },
    },
  ]);

  res.status(200).json(userFriends);
});

export const getUserPendingRequest = asyncWrapper(async function (
  req,
  res,
  next
) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for this operation"));

  const { friends, pendingRequests } = await User.findById(currUser.id).select(
    "friends pendingRequests"
  );

  const currUserRequestsArr = pendingRequests.map(
    (request) => request.adressat
  );
  const currUserFriendsArr = friends.map((friend) => friend.friend);

  const requests = await User.aggregate([
    {
      $match: {
        role: "user",
        _id: { $in: currUserRequestsArr },
      },
    },
    {
      $unwind: "$friends",
    },
    {
      $group: {
        _id: "$_id",
        friendsArr: { $push: "$friends.friend" },
        userName: { $first: "$userName" },
        profileImg: { $first: "$profileImg" },
      },
    },
    {
      $addFields: {
        matched: { $setIntersection: [currUserFriendsArr, "$friendsArr"] },
      },
    },
    {
      $addFields: {
        muntuals: { $size: "$matched" },
      },
    },
    {
      $project: {
        muntuals: 1,
        userName: 1,
        profileImg: 1,
      },
    },
    {
      $sort: { createdAt: 1 },
    },
  ]);

  res.status(200).json(requests);
});

export const getUserSentRequest = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for this operation"));

  const { friends, sentRequests } = await User.findById(currUser.id).select(
    "friends sentRequests"
  );

  const currUserRequestsArr = sentRequests.map((request) => request.adressat);
  const currUserFriendsArr = friends.map((friend) => friend.friend);

  const requests = await User.aggregate([
    {
      $match: {
        role: "user",
        _id: { $in: currUserRequestsArr },
      },
    },
    {
      $unwind: "$friends",
    },
    {
      $group: {
        _id: "$_id",
        friendsArr: { $push: "$friends.friend" },
        userName: { $first: "$userName" },
        profileImg: { $first: "$profileImg" },
      },
    },
    {
      $addFields: {
        matched: { $setIntersection: [currUserFriendsArr, "$friendsArr"] },
      },
    },
    {
      $addFields: {
        muntuals: { $size: "$matched" },
      },
    },
    {
      $project: {
        muntuals: 1,
        userName: 1,
        profileImg: 1,
      },
    },
    {
      $sort: { userName: 1 },
    },
  ]);

  res.status(200).json(requests);
});

export const getPendingRequestsCount = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;
  const { userId } = req.params;

  if (currUser.id !== userId)
    return next(new AppError(403, "you are not authorised for this operation"));

  User.findById(currUser.id)
    .select("pendingRequests._id pendingRequests.seen")
    .exec(function (err, data) {
      const notSeen = [...data.pendingRequests].filter(
        (req) => req.seen === false
      );
      res.status(200).json(notSeen);
    });
});
