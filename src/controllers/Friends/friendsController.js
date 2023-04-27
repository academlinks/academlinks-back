const mongoose = require("mongoose");
const AppError = require("../../lib/AppError.js");
const asyncWrapper = require("../../lib/asyncWrapper.js");

const controllUserExistence = require("../../utils/friendsControllerUtils.js");

const { Friendship } = require("../../models");

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
