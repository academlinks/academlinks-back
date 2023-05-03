const { AppError, asyncWrapper } = require("../../lib");
const { User, Friendship, Post, Bookmarks } = require("../../models");
const { UserUtils } = require("../../utils/user");

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

  const { isFriend, isCurrUser } = UserUtils.checkIfIsFriend({
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
        UserUtils.checkIfIsFriendOnEach({
          currUser,
          doc,
          docId,
          userFriendShip,
        }),
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
        UserUtils.checkIfIsFriendOnEach({
          currUser,
          doc,
          docId,
          userFriendShip,
        }),
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
        UserUtils.checkIfIsFriendOnEach({
          currUser,
          doc,
          docId,
          userFriendShip,
        }),
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
        UserUtils.checkIfIsFriendOnEach({
          currUser,
          doc,
          docId,
          userFriendShip,
        }),
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
        UserUtils.checkIfIsFriendOnEach({
          currUser,
          doc,
          docId,
          userFriendShip,
        }),
      populate: [
        { path: "author tags.user", select: "userName profileImg" },
        {
          path: "authentic",
          select: "-__v",
          transform: (doc, docId) =>
            UserUtils.checkIfIsFriendOnEach({
              currUser,
              doc,
              docId,
              userFriendShip,
            }),
          populate: {
            path: "tags.user author",
            select: "userName profileImg",
          },
        },
      ],
    });

  res.status(200).json({ data: savedPosts, results: postsLength });
});
