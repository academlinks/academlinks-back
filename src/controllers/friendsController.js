const mongoose = require("mongoose");
const AppError = require("../lib/AppError.js");
const asyncWrapper = require("../lib/asyncWrapper.js");
const { useSocket, socket_name_placeholders } = require("../utils/ioUtils.js");

const Friendship = require("../models/Friendship.js");

const controllUserExistence = require("../utils/friendsControllerUtils.js");
const {
  controllFriendRequestNotification,
} = require("../utils/notificationControllerUtils.js");

exports.sendFriendRequest = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { user, adressatUser } = await controllUserExistence({ req, next });

  await Friendship.findOneAndUpdate(
    { user: currUser.id },
    { $push: { sentRequests: { adressat: adressatUser._id } } }
  );

  await Friendship.findOneAndUpdate(
    { user: adressatUser.id },
    { $push: { pendingRequests: { adressat: currUser.id } } }
  );

  await controllFriendRequestNotification({
    req,
    currUser: user._id.toString(),
    adressat: adressatUser._id.toString(),
    send: true,
  });

  await useSocket(req, {
    adressatId: adressatUser._id,
    operationName: socket_name_placeholders.receiveNewFriendRequest,
    data: 1,
  });

  res.status(200).json({ sent: true });
});

exports.cancelFriendRequest = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;

  const { user, adressatUser } = await controllUserExistence({ req, next });

  await Friendship.findOneAndUpdate(
    { user: currUser.id },
    {
      $pull: {
        sentRequests: { adressat: mongoose.Types.ObjectId(adressatUser._id) },
      },
    }
  );

  await Friendship.findOneAndUpdate(
    { user: adressatUser._id },
    {
      $pull: {
        pendingRequests: { adressat: mongoose.Types.ObjectId(currUser.id) },
      },
    }
  );

  res.status(200).json({ canceled: true });
});

exports.deleteFriendRequest = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;

  const { user, adressatUser } = await controllUserExistence({ req, next });

  await Friendship.findOneAndUpdate(
    { user: currUser.id },
    {
      $pull: {
        pendingRequests: {
          adressat: mongoose.Types.ObjectId(adressatUser._id),
        },
      },
    }
  );

  await Friendship.findOneAndUpdate(
    { user: adressatUser._id },
    {
      $pull: {
        sentRequests: { adressat: mongoose.Types.ObjectId(currUser.id) },
      },
    }
  );

  res.status(200).json({ deleted: true });
});

exports.confirmFriendRequest = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;

  const { user, adressatUser } = await controllUserExistence({ req, next });

  await Friendship.findOneAndUpdate(
    { user: currUser.id },
    {
      $pull: {
        pendingRequests: {
          adressat: mongoose.Types.ObjectId(adressatUser._id),
        },
      },
      $push: { friends: { friend: adressatUser._id } },
      $inc: { friendsAmount: 1 },
    }
  );

  await Friendship.findOneAndUpdate(
    { user: adressatUser._id },
    {
      $pull: {
        sentRequests: { adressat: mongoose.Types.ObjectId(currUser.id) },
      },
      $push: { friends: { friend: currUser.id } },
      $inc: { friendsAmount: 1 },
    }
  );

  await controllFriendRequestNotification({
    req,
    currUser: user._id.toString(),
    adressat: adressatUser._id.toString(),
    confirm: true,
  });

  res.status(200).json({
    _id: adressatUser._id,
    userName: adressatUser.userName,
    profileImg: adressatUser.profileImg,
  });
});

exports.deleteFriend = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { user, adressatUser } = await controllUserExistence({ req, next });

  await Friendship.findOneAndUpdate(
    { user: currUser.id },
    {
      $pull: {
        friends: {
          friend: mongoose.Types.ObjectId(adressatUser._id),
        },
      },
      $inc: { friendsAmount: -1 },
    }
  );

  await Friendship.findOneAndUpdate(
    { user: adressatUser._id },
    {
      $pull: {
        friends: { friend: mongoose.Types.ObjectId(currUser.id) },
      },
      $inc: { friendsAmount: -1 },
    }
  );

  res.status(200).json({ deleted: true });
});

exports.getUserFriends = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const userFriends = await Friendship.aggregate([
    {
      $match: { user: mongoose.Types.ObjectId(userId) },
    },
    {
      $project: {
        friends: 1,
      },
    },
    {
      $lookup: {
        as: "friend",
        from: "users",
        localField: "friends.friend",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              userName: 1,
              profileImg: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$friends",
    },
    {
      $unwind: "$friend",
    },
    {
      $addFields: {
        friend: {
          _id: "$friend._id",
          userName: "$friend.userName",
          profileImg: "$friend.profileImg",
          createdAt: "$friends.createdAt",
        },
      },
    },
    {
      $group: {
        _id: "$friend._id",
        friend: { $first: "$friend" },
      },
    },
    {
      $lookup: {
        as: "friendFriends",
        from: "friendships",
        localField: "friend._id",
        foreignField: "user",
        pipeline: [
          {
            $project: {
              "friends.friend": 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$friendFriends",
    },
    {
      $group: {
        _id: "$friend._id",
        friend: { $first: "$friend" },
        friendFriends: { $push: "$friendFriends.friends.friend" },
      },
    },
    {
      $unwind: "$friendFriends",
    },
    {
      $addFields: { currUserId: mongoose.Types.ObjectId(currUser.id) },
    },
    {
      $lookup: {
        as: "currUserFriends",
        from: "friendships",
        localField: "currUserId",
        foreignField: "user",
        pipeline: [
          {
            $project: {
              "friends.friend": 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$currUserFriends",
    },
    {
      $group: {
        _id: "$_id",
        friend: { $first: "$friend" },
        friendFriends: { $first: "$friendFriends" },
        currUserFriends: { $push: "$currUserFriends.friends.friend" },
      },
    },
    {
      $unwind: "$currUserFriends",
    },
    {
      $addFields: {
        matched: { $setIntersection: ["$friendFriends", "$currUserFriends"] },
      },
    },
    {
      $addFields: { muntual: { $size: "$matched" } },
    },
    {
      $project: {
        friend: 1,
        muntual: 1,
      },
    },
    {
      $sort: { "friend.createdAt": -1 },
    },
  ]);

  res.status(200).json(userFriends);
});

exports.getUserPendingRequest = asyncWrapper(async function (
  req,
  res,
  next
) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for this operation"));

  const requests = await Friendship.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(currUser.id),
      },
    },
    {
      $project: {
        user: 1,
        friends: 1,
        pendingRequests: 1,
      },
    },
    { $unwind: "$pendingRequests" },
    {
      $lookup: {
        as: "requestAuthor",
        from: "users",
        localField: "pendingRequests.adressat",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              userName: 1,
              profileImg: 1,
              _id: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$requestAuthor",
    },
    {
      $addFields: {
        pendingRequest: {
          _id: "$requestAuthor._id",
          profileImg: "$requestAuthor.profileImg",
          userName: "$requestAuthor.userName",
          seen: "$pendingRequests.seen",
          createdAt: "$pendingRequests.createdAt",
        },
      },
    },
    {
      $project: {
        _id: 1,
        pendingRequest: 1,
        friends: 1,
      },
    },
    {
      $lookup: {
        as: "reqAuthorFriends",
        from: "friendships",
        localField: "pendingRequest._id",
        foreignField: "user",
        pipeline: [
          {
            $project: {
              friends: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$reqAuthorFriends",
    },
    {
      $group: {
        _id: "$pendingRequest._id",
        friends: { $first: "$friends.friend" },
        pendingRequest: { $first: "$pendingRequest" },
        reqAuthorFriends: { $push: "$reqAuthorFriends.friends.friend" },
      },
    },
    {
      $unwind: "$reqAuthorFriends",
    },
    {
      $addFields: {
        matched: { $setIntersection: ["$friends", "$reqAuthorFriends"] },
      },
    },
    {
      $addFields: {
        muntuals: { $size: "$matched" },
      },
    },
    {
      $project: {
        pendingRequest: 1,
        muntuals: 1,
      },
    },
    {
      $sort: { "pendingRequest.createdAt": -1 },
    },
  ]);

  res.status(200).json(requests);
});

exports.getUserSentRequest = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for this operation"));

  const requests = await Friendship.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(currUser.id),
      },
    },
    {
      $project: {
        user: 1,
        friends: 1,
        sentRequests: 1,
      },
    },
    { $unwind: "$sentRequests" },
    {
      $lookup: {
        as: "requestAuthor",
        from: "users",
        localField: "sentRequests.adressat",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              userName: 1,
              profileImg: 1,
              _id: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$requestAuthor",
    },
    {
      $addFields: {
        sentRequest: {
          _id: "$requestAuthor._id",
          profileImg: "$requestAuthor.profileImg",
          userName: "$requestAuthor.userName",
          seen: "$pendingRequests.seen",
          createdAt: "$sentRequests.createdAt",
        },
      },
    },
    {
      $project: {
        _id: 1,
        sentRequest: 1,
        friends: 1,
      },
    },
    {
      $lookup: {
        as: "reqAuthorFriends",
        from: "friendships",
        localField: "sentRequest._id",
        foreignField: "user",
        pipeline: [
          {
            $project: {
              friends: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$reqAuthorFriends",
    },
    {
      $group: {
        _id: "$sentRequest._id",
        friends: { $first: "$friends.friend" },
        sentRequest: { $first: "$sentRequest" },
        reqAuthorFriends: { $push: "$reqAuthorFriends.friends.friend" },
      },
    },
    {
      $unwind: "$reqAuthorFriends",
    },
    {
      $addFields: {
        matched: { $setIntersection: ["$friends", "$reqAuthorFriends"] },
      },
    },
    {
      $addFields: {
        muntuals: { $size: "$matched" },
      },
    },
    {
      $project: {
        sentRequest: 1,
        muntuals: 1,
      },
    },
    {
      $sort: { "sentRequest.createdAt": -1 },
    },
  ]);

  res.status(200).json(requests);
});

exports.getPendingRequestsCount = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;
  const { userId } = req.params;

  if (currUser.id !== userId)
    return next(new AppError(403, "you are not authorised for this operation"));

  Friendship.findOne({ user: currUser.id })
    .select("pendingRequests._id pendingRequests.seen")
    .exec(function (err, data) {
      const notSeen = [...data.pendingRequests].filter(
        (req) => req.seen === false
      );
      res.status(200).json(notSeen);
    });
});

exports.markPendingRequestsAsSeen = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;

  const { userId } = req.params;

  if (currUser.id !== userId)
    return next(new AppError(403, "you are not authorised for this operation"));

  await Friendship.findOneAndUpdate(
    { user: currUser.id },
    {
      $set: { "pendingRequests.$[el].seen": true },
    },
    { arrayFilters: [{ "el.seen": false }], new: true }
  );

  res.status(200).json({ isMarked: true });
});
