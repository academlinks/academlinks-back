import AppError from "../lib/AppError.js";
import { asyncWrapper } from "../lib/asyncWrapper.js";

import Post from "../models/Post.js";
import User from "../models/User.js";
import Bookmarks from "../models/Bookmarks.js";
import Friendship from "../models/Friendship.js";

import { uploadMedia, editMedia } from "../lib/multer.js";
import {
  deleteExistingImage,
  checkIfIsFriend,
  checkIfIsFriendOnEach,
} from "../utils/userControllerUtils.js";

export const resizeAndOptimiseMedia = editMedia({
  multy: false,
  resize: false,
});

export const uploadUserProfileFile = (imageName) =>
  uploadMedia({
    storage: "memoryStorage",
    upload: "single",
    filename: imageName,
  });

export const updateProfileImage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const user = await User.findById(currUser.id);

  const existingProfileImg = user.profileImg;
  const originalFileNameFragments = existingProfileImg.split("/")?.slice(3);

  let mediaUrl;
  try {
    if (
      !originalFileNameFragments[1] &&
      originalFileNameFragments[1] !== "profile-default.jpg"
    )
      await deleteExistingImage(originalFileNameFragments);
    mediaUrl = `${req.protocol}://${"localhost:4000"}/${req.xOriginal}`;
  } catch (error) {
    return next(
      new AppError(
        406,
        "something went wrong, cant't find and delete your existing profile images. please report the problem or try later"
      )
    );
  }

  user.profileImg = mediaUrl;

  await user.save();

  res.status(201).json(mediaUrl);
});

export const updateCoverImage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const user = await User.findById(currUser.id);

  const existingProfileImg = user.coverImg;
  const originalFileNameFragments = existingProfileImg.split("/")?.slice(3);

  let mediaUrl;
  try {
    if (
      !originalFileNameFragments[1] &&
      originalFileNameFragments[1] !== "cover-default.webp"
    )
      await deleteExistingImage(originalFileNameFragments);
    mediaUrl = `${req.protocol}://${"localhost:4000"}/${req.xOriginal}`;
  } catch (error) {
    return next(
      new AppError(
        406,
        "something went wrong, cant't find and delete your existing cover images. please report the problem or try later"
      )
    );
  }

  user.coverImg = mediaUrl;

  await user.save();

  res.status(201).json(mediaUrl);
});

export const searchUsers = asyncWrapper(async function (req, res, next) {
  const { key } = req.query;

  const users = await User.find({ userName: { $regex: key } }).select(
    "userName profileImg"
  );

  res.status(200).json(users);
});

export const getUserProfile = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  // const currUser = req.user;

  const user = await User.findById(userId).select(
    "-education -workplace.description -workplace.workingYears"
  );

  if (!user) return next(new AppError(404, "there are no such an user"));

  const userFriends = await Friendship.findOne({ user: userId })
    .select("friends friendsAmount")
    .populate({
      path: "friends.friend",
      select: "userName profileImg",
      options: { limit: 9 },
    });

  const userProfile = {
    ...user._doc,
    workplace: user._doc.workplace[0],
    friends: userFriends.friends.slice(0, 9).map((fr) => fr.friend),
    friendsAmount: userFriends.friendsAmount,
  };

  res.status(200).json(userProfile);
});

export const getProfilePosts = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { page, limit, hasMore } = req.query;

  const skip = page * limit - limit;

  const postQuery = {
    type: "post",
    $and: [
      {
        $or: [
          { author: userId, hidden: false },
          { "tags.user": userId, "tags.hidden": false },
        ],
      },
    ],
  };

  const user = await User.findById(currUser.id);
  const userFriendShip = await Friendship.findOne({ user: currUser.id });

  const { isFriend, isCurrUser } = checkIfIsFriend({
    user,
    userFriendShip,
    userId,
  });

  if (!isCurrUser) {
    if (isFriend) postQuery.audience = { $in: ["friends", "public"] };
    else postQuery.audience = "public";
  }

  let postsLength;
  if (hasMore && !JSON.parse(hasMore))
    postsLength = await Post.find(postQuery).countDocuments();

  const posts = await Post.find(postQuery)
    .skip(skip)
    .limit(limit)
    .sort("-createdAt")
    .populate({
      path: "author tags.user",
      select: "userName profileImg",
    })
    .populate({
      path: "authentic",
      select: "-shared -__v",
      transform: (doc, docId) =>
        checkIfIsFriendOnEach({ user, userFriendShip, doc, docId }),
      populate: { path: "author tags.user", select: "userName profileImg" },
    });

  res.status(200).json({ data: posts, results: postsLength });
});

export const getPendingPosts = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for this operation"));

  const user = await User.findById(currUser.id);
  const userFriendShip = await Friendship.findOne({ user: currUser.id });

  const pendingPosts = await Post.find({
    "tags.user": userId,
    "tags.hidden": true,
    "tags.review": false,
    audience: { $ne: "private" },
    type: { $ne: "blogPost" },
  })
    .populate({
      path: "author tags.user",
      select: "userName profileImg",
    })
    .populate({
      path: "authentic",
      select: "-reactions -shared -__v",
      transform: (doc, docId) =>
        checkIfIsFriendOnEach({ user, doc, docId, userFriendShip }),
      populate: { path: "author tags.user", select: "userName profileImg" },
    })
    .sort("-createdAt");

  res.status(200).json(pendingPosts);
});

export const getHiddenPosts = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised"));

  const user = await User.findById(currUser.id);
  const userFriendShip = await Friendship.findOne({ user: currUser.id });

  const hiddenPosts = await Post.find({
    $or: [
      { author: userId, hidden: true },
      { "tags.user": userId, "tags.review": true, "tags.hidden": true },
    ],
    audience: { $ne: "private" },
  })
    .populate({ path: "author tags.user", select: "userName profileImg" })
    .populate({
      path: "authentic",
      select: "-reactions -shared -__v",
      transform: (doc, docId) =>
        checkIfIsFriendOnEach({ user, doc, docId, userFriendShip }),
      populate: { path: "author tags.user", select: "userName profileImg" },
    })
    .sort("-createdAt");

  res.status(200).json(hiddenPosts);
});

export const getUserFeed = asyncWrapper(async function (req, reqs, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { page, limit, hasMore } = req.query;

  if (currUser.id !== userId)
    return next(new AppError(401, "you are not authorized for this operation"));

  const user = await User.findById(currUser.id);
  if (!user) return next(new AppError(404, "there are no such an user"));

  const userFriendShip = await Friendship.findOne({ user: currUser.id });
  const userFriendsIds = userFriendShip.friends.map((friend) => friend.friend);

  const skip = page * limit - limit;

  const postQuery = {
    $or: [{ author: userId }, { author: userFriendsIds }],
    type: "post",
    audience: { $in: ["public", "friends"] },
  };

  let postsLength;
  if (hasMore && !JSON.parse(hasMore))
    postsLength = await Post.find(postQuery).countDocuments();

  const feedPosts = await Post.find(postQuery)
    .skip(skip)
    .limit(limit)
    .sort("-createdAt")
    .populate({
      path: "author tags.user",
      select: "userName profileImg",
    })
    .populate({
      path: "authentic",
      select: "-__v -shared",
      transform: (doc, docId) =>
        checkIfIsFriendOnEach({ user, doc, docId, userFriendShip }),
      populate: { path: "author tags.user", select: "userName profileImg" },
    });

  reqs.status(200).json({ data: feedPosts, results: postsLength });
});

export const getBookmarks = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { page, limit, hasMore } = req.query;

  const skip = page * limit - limit;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorizd for this operation"));

  let postsLength;
  if (hasMore && !JSON.parse(hasMore))
    postsLength = await Bookmarks.find({ author: userId }).countDocuments();

  const user = await User.findById(userId);
  const userFriendShip = await Friendship.findOne({ user: currUser.id });

  const savedPosts = await Bookmarks.find({ author: userId })
    .skip(skip)
    .limit(limit)
    .sort("-createdAt")
    .populate({
      path: "post",
      select: "-__v",
      transform: (doc, docId) =>
        checkIfIsFriendOnEach({ user, doc, docId, userFriendShip }),
      populate: [
        { path: "author tags.user", select: "userName profileImg" },
        {
          path: "authentic",
          select: "-__v",
          transform: (doc, docId) =>
            checkIfIsFriendOnEach({ user, doc, docId, userFriendShip }),
          populate: {
            path: "tags.user author",
            select: "userName profileImg",
          },
        },
      ],
    });

  res.status(200).json({ data: savedPosts, results: postsLength });
});

export const isFriend = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const user = await User.findById(currUser.id);
  const userFriendShip = await Friendship.findOne({ user: currUser.id });

  const { info } = checkIfIsFriend({ user, userId, userFriendShip });

  res.status(200).json(info);
});

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
export const getUser = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const user = await User.findById(currUser.id);
  const userFriendShip = await Friendship.findOne({
    user: currUser.id,
  }).populate("sentRequests.adressat pendingRequests.adressat friends.friend");

  res.status(200).json();
});

export const getAllUsers = asyncWrapper(async function (req, res, next) {
  const users = await User.find({ userName: { $regex: key } });

  res.status(200).json();
});

export const updater = asyncWrapper(async function (req, res, next) {
  await User.updateMany(
    { birthDate: { $exists: false } },
    {
      birthDate: "02-02-1990",
    }
  );
});

// updater();
