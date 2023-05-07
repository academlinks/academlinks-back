const {
  Bookmarks,
  Post,
  Comment,
  Notification,
  Conversation,
  Message,
  Friendship,
  User,
} = require("../../models");
const mongoose = require("mongoose");
const { UserUtils } = require("../../utils/user");
const { PostUtils } = require("../../utils/posts");
const { AppError, asyncWrapper, Upload } = require("../../lib");

const upload = new Upload({
  multy: false,
  storage: "memoryStorage",
  upload: "single",
});

exports.uploadUserProfileFile = (imageName) =>
  upload.uploadMedia({
    filename: imageName,
  });

exports.resizeAndOptimiseMedia = upload.editMedia();

exports.updateProfileImage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const user = await User.findById(currUser.id);

  const { mediaUrl } = await UserUtils.manageUserProfileMedia({
    next,
    media: user.profileImg,
    fileName: req.xOriginal,
  });

  user.profileImg = mediaUrl;

  await user.save();

  res.status(201).json(mediaUrl);
});

exports.updateCoverImage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const user = await User.findById(currUser.id);

  const { mediaUrl } = await UserUtils.manageUserProfileMedia({
    next,
    media: user.coverImg,
    fileName: req.xOriginal,
  });

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
  const validPassword =
    user && currUser.role !== "admin"
      ? await user.checkPassword(password, user.password)
      : false;

  if (currUser.role !== "admin" && !user && !validPassword)
    return next(new AppError(403, "you are not authorized for this operation"));

  // ================================================ //
  // ========== Delete CurrUser Bookmarks ========== //
  // ============================================== //

  // 1.0 Delete CurrUser Bookmarks
  await Bookmarks.deleteMany({ author: userId });

  // ============================================ //
  // ========== Delete CurrUser Posts ========== //
  // ========================================== //

  // 2.0 Find And Extract CurrUser Post Ids
  const posts = await Post.find({ author: userId }).select("_id media");
  const userPostsId = posts.map((post) => post._id);

  // 2.1 Delete CurrUser Posts Media Files
  await PostUtils.managePostMediaDeletionOnEachPost({ posts, next });

  // 2.2 Delete CurrUser Posts
  await Post.deleteMany({ author: userId });

  // 2.3 Updated Shared Deleted Posts
  await Post.updateMany(
    { shared: true, authentic: userPostsId },
    { $set: { deleted: true } }
  );

  // 2.4 Updated Saved Deleted Posts
  await Bookmarks.updateMany(
    { post: userPostsId },
    { $set: { deleted: true } }
  );

  // =============================================== //
  // ========== Delete CurrUser Comment =========== //
  // ============================================= //

  // 3.0 Delete Comment Which Are Binded To CurrUser Posts
  await Comment.deleteMany({ post: { $in: userPostsId } });

  // 3.1 Update CurrUser Comment On Other Users Posts
  await Comment.updateMany(
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
  // ========== Delete CurrUser Notification ========== //
  // ================================================== //

  // 4.0 Delete User Notifications
  await Notification.deleteMany({ adressat: userId });

  // 4.1 Update Notifications Trigered By CurrUser
  await Notification.updateMany(
    { from: userId },
    {
      $set: {
        isDeletedSender: { isDeletedUser: true, cachedUserName: user.userName },
      },
    }
  );

  // ======================================================== //
  // ========== Delete Conversations And Message ========== //
  // ====================================================== //

  // 5.0 Find CurrUser Conversations And Extract Ids
  const conversations = await Conversation.find({
    users: userId,
    deletion: { $elemMatch: { deleted: false, deletedBy: userId } },
  }).select("_id");

  const conversationIds = conversations.map((conv) => conv._id);

  // 5.1 Mark Conversations And Messages As Deleted By CurrUser
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

  await Message.updateMany(
    {
      conversation: { $in: conversationIds },
      "deletion.deletedBy": { $ne: currUser.id },
    },
    { $push: { deletion: { deleted: true, deletedBy: currUser.id } } }
  );

  // 5.2 Find Conversations With CurrUser Which Are Marked As Deleted By Adressat And Extract Ids
  const conversationToDeletePermanently = await Conversation.find({
    users: userId,
    deletion: { $elemMatch: { deleted: true, deletedBy: { $ne: userId } } },
  }).select("_id");

  // 5.3 Delete Convesations And Messages Permanently Which Are Marked As Deleted By CurrUser And Adressat
  const conversationToDeletePermanentlyIds =
    conversationToDeletePermanently.map((conv) => conv._id);
  await Conversation.deleteMany({
    _id: { $in: conversationToDeletePermanentlyIds },
  });
  await Message.deleteMany({
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
  await UserUtils.deleteAllUserProfileMedia({
    next,
    media: [user.profileImg, user.coverImg],
  });

  // 7.2 Delete User
  await User.findByIdAndDelete(userId);

  // ====================================== //
  // ========== Clean Up Cookie ========== //
  // ==================================== //

  // 8.0 logout user
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

  // const count = await Conversation.find({
  //   users: currUser.id,
  //   "lastMessage.author": { $ne: currUser.id },
  //   seen: false,
  // }).select("_id");

  // const unreadNotifications = await Notification.find({
  //   adressat: currUser.id,
  //   seen: false,
  // }).select("_id read");

  Friendship.findOne({ user: currUser.id })
    .select("pendingRequests._id pendingRequests.seen")
    .exec(function (err, data) {
      const notSeen = [...data.pendingRequests].filter(
        (req) => req.seen === false
      );
      res.status(200).json(notSeen);
    });
});

exports.isFriend = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) return next(new AppError(404, "user does not exists"));

  const userFriendShip = await Friendship.findOne({ user: currUser.id });

  const { info } = UserUtils.checkIfIsFriend({
    currUser,
    userId,
    userFriendShip,
  });

  res.status(200).json(info);
});
