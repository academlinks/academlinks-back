const mongoose = require("mongoose");

const AppError = require("../lib/AppError.js");
const asyncWrapper = require("../lib/asyncWrapper.js");

const Bookmarks = require("../models/Bookmarks.js");
const Post = require("../models/Post.js");
const Comments = require("../models/Comment.js");
const Notifications = require("../models/Notification.js");
const Conversation = require("../models/Conversation.js");
const Messages = require("../models/Message.js");
const Friendship = require("../models/Friendship.js");
const User = require("../models/User.js");

const {
  deleteExistingImage,
  checkIfIsFriend,
  checkIfIsFriendOnEach,
} = require("../utils/userControllerUtils.js");
const { uploadMedia, editMedia } = require("../lib/multer.js");
const { getServerHost } = require("../lib/getOrigins.js");
// const { updateBlackList } = require("../lib/controllBlackList.js");

exports.resizeAndOptimiseMedia = editMedia({
  multy: false,
  resize: false,
});

exports.uploadUserProfileFile = (imageName) =>
  uploadMedia({
    storage: "memoryStorage",
    upload: "single",
    filename: imageName,
  });

exports.updateProfileImage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const user = await User.findById(currUser.id);

  const existingProfileImg = user.profileImg;
  const originalFileNameFragments = existingProfileImg.split("/")?.slice(4);

  let mediaUrl;
  try {
    if (
      originalFileNameFragments[0] &&
      !originalFileNameFragments[0].startsWith("avatar-")
    )
      await deleteExistingImage(originalFileNameFragments);

    mediaUrl = `${getServerHost()}/uploads/${req.xOriginal}`;
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

exports.updateCoverImage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const user = await User.findById(currUser.id);

  const existingProfileImg = user.coverImg;
  const originalFileNameFragments = existingProfileImg.split("/")?.slice(4);

  let mediaUrl;
  try {
    if (
      originalFileNameFragments[0] &&
      originalFileNameFragments[0] !== "cover-default.webp"
    )
      await deleteExistingImage(originalFileNameFragments);

    mediaUrl = `${getServerHost()}/uploads/${req.xOriginal}`;
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

exports.deleteUser = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { password } = req.body;

  if (
    (currUser.role !== "admin" && currUser.id !== userId) ||
    (currUser.role !== "admin" && !password)
  )
    return next(new AppError(403, "you are not authorized for this operation"));

  const user = await User.findById(userId).select("+password");

  if (!user) return next(new AppError(403, "user does not exists"));

  const validPassword = await user.checkPassword(password, user.password);
  if (currUser.role !== "admin" && !validPassword)
    return next(new AppError(403, "you are not authorized for this operation"));

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
  if (currUser.role === "user") {
    // await updateBlackList(req, currUser.id);
    res.cookie("authorization", "");
    res.clearCookie("authorization");
    res.end();
  } else res.status(200).json({ done: true });
});

exports.searchUsers = asyncWrapper(async function (req, res, next) {
  const { key } = req.query;

  const users = await User.find({ userName: { $regex: key } }).select(
    "userName profileImg"
  );

  res.status(200).json(users);
});

exports.getUserProfile = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  // const currUser = req.user;

  const user = await User.findById(userId).select("-education -workplace");

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
    friends: userFriends.friends.slice(0, 9).map((fr) => fr.friend),
    friendsAmount: userFriends.friendsAmount,
  };

  res.status(200).json(userProfile);
});

exports.getBadges = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;

  if (currUser.id !== userId)
    return next(new AppError(403, "you are not authorized for this operation"));

  const count = await Conversation.find({
    users: currUser.id,
    "lastMessage.author": { $ne: currUser.id },
    seen: false,
  }).select("_id");

  const unreadNotifications = await Notification.find({
    adressat: currUser.id,
    seen: false,
  }).select("_id read");

  Friendship.findOne({ user: currUser.id })
    .select("pendingRequests._id pendingRequests.seen")
    .exec(function (err, data) {
      const notSeen = [...data.pendingRequests].filter(
        (req) => req.seen === false
      );
      res.status(200).json(notSeen);
    });
});

exports.getProfilePosts = asyncWrapper(async function (req, res, next) {
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

  const user = await User.findById(userId);

  if (!user) return next(new AppError(404, "user does not exists"));

  const userFriendShip = await Friendship.findOne({ user: currUser.id });

  const { isFriend, isCurrUser } = checkIfIsFriend({
    currUser,
    userId,
    userFriendShip,
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
        checkIfIsFriendOnEach({ currUser, doc, docId, userFriendShip }),
      populate: { path: "author tags.user", select: "userName profileImg" },
    });

  res.status(200).json({ data: posts, results: postsLength });
});

exports.getPendingPosts = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for this operation"));

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
        checkIfIsFriendOnEach({ currUser, doc, docId, userFriendShip }),
      populate: { path: "author tags.user", select: "userName profileImg" },
    })
    .sort("-createdAt");

  res.status(200).json(pendingPosts);
});

exports.getHiddenPosts = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised"));

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
        checkIfIsFriendOnEach({ currUser, doc, docId, userFriendShip }),
      populate: { path: "author tags.user", select: "userName profileImg" },
    })
    .sort("-createdAt");

  res.status(200).json(hiddenPosts);
});

exports.getUserFeed = asyncWrapper(async function (req, reqs, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { page, limit, hasMore } = req.query;

  if (currUser.id !== userId)
    return next(new AppError(403, "you are not authorized for this operation"));

  const user = await User.findById(userId);
  if (!user) return next(new AppError(404, "there are no such an user"));

  const userFriendShip = await Friendship.findOne({ user: currUser.id });
  const userFriendsIds = userFriendShip.friends.map((friend) => friend.friend);

  const skip = page * limit - limit;

  const postQuery = {
    $or: [
      { author: userId },
      { author: userFriendsIds },
      { "tags.user": userFriendsIds },
    ],
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
        checkIfIsFriendOnEach({ currUser, doc, docId, userFriendShip }),
      populate: { path: "author tags.user", select: "userName profileImg" },
    });

  reqs.status(200).json({ data: feedPosts, results: postsLength });
});

exports.getBookmarks = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { page, limit, hasMore } = req.query;

  const skip = page * limit - limit;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorizd for this operation"));

  let postsLength;
  if (hasMore && !JSON.parse(hasMore))
    postsLength = await Bookmarks.find({ author: userId }).countDocuments();

  const userFriendShip = await Friendship.findOne({ user: currUser.id });

  const savedPosts = await Bookmarks.find({ author: currUser.id })
    .skip(skip)
    .limit(limit)
    .sort("-createdAt")
    .populate({
      path: "post",
      select: "-__v",
      transform: (doc, docId) =>
        checkIfIsFriendOnEach({ currUser, doc, docId, userFriendShip }),
      populate: [
        { path: "author tags.user", select: "userName profileImg" },
        {
          path: "authentic",
          select: "-__v",
          transform: (doc, docId) =>
            checkIfIsFriendOnEach({ currUser, doc, docId, userFriendShip }),
          populate: {
            path: "tags.user author",
            select: "userName profileImg",
          },
        },
      ],
    });

  res.status(200).json({ data: savedPosts, results: postsLength });
});

exports.isFriend = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) return next(new AppError(404, "user does not exists"));

  const userFriendShip = await Friendship.findOne({ user: currUser.id });

  const { info } = checkIfIsFriend({ currUser, userId, userFriendShip });

  res.status(200).json(info);
});

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
exports.getUser = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const user = await User.findById(currUser.id);
  const userFriendShip = await Friendship.findOne({
    user: currUser.id,
  }).populate("sentRequests.adressat pendingRequests.adressat friends.friend");

  res.status(200).json();
});

exports.getAllUsers = asyncWrapper(async function (req, res, next) {
  const users = await User.find({ userName: { $regex: key } });

  res.status(200).json();
});

async function updater(req, res, next) {
  await User.create({
    gender: "female",
    email: "test2@io.com",
    firstName: "john",
    lastName: "russ",
    birthDate: "02-02-1996",
    currentLivingPlace: {
      country: "georgia",
      city: "ozurgeti",
    },
    from: {
      country: "georgia",
      city: "ozurgeti",
    },
    currentWorkplace: {
      institution: "tsu",
      position: "researcher",
      description: "one two",
    },
  });
}

// updater();
