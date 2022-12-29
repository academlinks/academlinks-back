import AppError from "../lib/AppError.js";
import { asyncWrapper } from "../lib/asyncWrapper.js";

import Bookmarks from "../models/Bookmarks.js";
import Post from "../models/Post.js";
import Comments from "../models/Comment.js";
import Notifications from "../models/Notification.js";
import Conversation from "../models/Conversation.js";
import Messages from "../models/Message.js";
import Friendship from "../models/Friendship.js";
import User from "../models/User.js";

import { uploadMedia, editMedia } from "../lib/multer.js";
import {
  deleteExistingImage,
  checkIfIsFriend,
  checkIfIsFriendOnEach,
} from "../utils/userControllerUtils.js";
import mongoose from "mongoose";

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

export const deleteUser = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;

  if (currUser.role !== "admin" && currUser.id !== userId)
    return next(new AppError(403, "you are not authorized for this operation"));

  const user = await User.findById(userId);

  if (!user) return next(new AppError(403, "user does not exists"));

  // ================================================ //
  // ========== Delete CurrUser Bookmarks ========== //
  // ============================================== //

  // 1.0
  await Bookmarks.deleteMany({ author: userId });

  // ============================================ //
  // ========== Delete CurrUser Posts ========== //
  // ========================================== //

  // 2.1 Find And Extract CurrUser Post Ids
  const posts = await Post.find({ author: userId }).select("_id");
  const userPostsId = posts.map((post) => post._id);

  // 2.2 Delete CurrUser Posts
  await Post.deleteMany({ author: userId });

  // =============================================== //
  // ========== Delete CurrUser Comments ========== //
  // ============================================= //

  // 3.1 Delete Comments Which Are Binded To CurrUser Posts
  await Comments.deleteMany({ post: { $in: userPostsId } });

  // 3.2 Update CurrUser Comments On Other Users Posts
  await Comments.updateMany(
    { author: userId },
    {
      $set: {
        cachedUser: {
          isDeleted: true,
          userName: user.userName,
          cachedUserId: user._id,
        },
        "replies.$[x].cachedUser.isDeleted": true,
        "replies.$[x].cachedUser.userName": user.userName,
        "replies.$[x].cachedUser.cachedUserId": userId,
      },
    },
    { arrayFilters: [{ "x.author": userId }] }
  );

  // ==================================================== //
  // ========== Delete CurrUser Notifications ========== //
  // ================================================== //

  // 4.0
  await Notifications.deleteMany({ adressat: userId });
  await Notifications.updateMany(
    { from: userId },
    {
      $set: {
        isDeletedSender: { isDeletedUser: true, cachedUserName: user.userName },
      },
    }
  );

  // ======================================================== //
  // ========== Delete Conversations And Messages ========== //
  // ====================================================== //

  // 5.1 Find CurrUser Conversations And Extract Ids
  const conversations = await Conversation.find({
    users: userId,
    deletion: { $elemMatch: { deleted: false, deletedBy: userId } },
  }).select("_id");

  const conversationIds = conversations.map((conv) => conv._id);

  // 5.2 Mark Conversations And Messages As Deleted By CurrUser
  await Conversation.updateMany(
    { users: userId },
    {
      $set: { "deletion.$[x].deleted": true },
      $push: {
        deletedUsers: {
          isDeleted: true,
          cachedUserName: user.userName,
          cachedUserId: userId,
        },
      },
    },
    { arrayFilters: [{ "x.deletedBy": userId }] }
  );

  await Messages.updateMany(
    {
      conversation: { $in: conversationIds },
      "deletion.deletedBy": { $ne: currUser.id },
    },
    { $push: { deletion: { deleted: true, deletedBy: currUser.id } } }
  );

  // 5.3 Find Conversations With CurrUser Which Are Marked As Deleted By Adressat And Extract Ids
  const conversationToDeletePermanently = await Conversation.find({
    users: userId,
    deletion: { $elemMatch: { deleted: true, deletedBy: { $ne: userId } } },
  }).select("_id");

  // 5.4 Delete Convesations And Messages Permanently Which Are Marked As Deleted By CurrUser And Adressat
  const conversationToDeletePermanentlyIds =
    conversationToDeletePermanently.map((conv) => conv._id);
  await Conversation.deleteMany({
    _id: { $in: conversationToDeletePermanentlyIds },
  });
  await Messages.deleteMany({
    conversation: { $in: conversationToDeletePermanentlyIds },
  });

  // ==================================================== //
  // ========== Remove Curr User From Friends ========== //
  // ================================================== //

  // 6.0 Remove CurrUser From Friendships
  await Friendship.updateMany(
    { "friends.friend": userId },
    {
      $pull: { friends: { friend: mongoose.Types.ObjectId(userId) } },
      $inc: { friendsAmount: -1 },
    }
  );

  // 6.1 Delete CurrUser Friendship
  await Friendship.deleteOne({ user: userId });

  // ================================== //
  // ========== Delete User ========== //
  // ================================ //

  // 7.1 Delete User Profile And Cover Images
  const existingProfileImg = user.profileImg;
  const profileFragments = existingProfileImg.split("/")?.slice(3);

  const existingCoverImg = user.profileImg;
  const coverFragments = existingCoverImg.split("/")?.slice(3);

  await Promise.allSettled(
    [profileFragments, coverFragments].map(
      async (fr) => await deleteExistingImage(fr)
    )
  );

  // 7.2 Delete User
  await User.findByIdAndDelete(userId);

  // ====================================== //
  // ========== Clean Up Cookie ========== //
  // ==================================== //
  
  // 8.0
  if (currUser.role === "user") res.clearCookie("authorization");

  res.status(200).json({ done: true });
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
