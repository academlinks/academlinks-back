const { uploadMedia, editMedia } = require("../../lib/multer.js");

const AppError = require("../../lib/AppError.js");
const asyncWrapper = require("../../lib/asyncWrapper.js");

const { Post, Comment, Bookmarks, Friendship } = require("../../models");

const {
  contollAudience,
  controllPostCreation,
  controllPostMediaDeletion,
  controllPostUpdateBody,
  controllPostMediaOnUpdate,
  controllPostReaction,
} = require("../../utils/postControllerUtils.js");

const {
  controllCreatePostNotification,
  controllSharePostNotification,
} = require("../../utils/notificationControllerUtils.js");

const { checkIfIsFriendOnEach } = require("../../utils/userControllerUtils.js");

const { getServerHost } = require("../../lib/getOrigins.js");

exports.resizeAndOptimiseMedia = editMedia({
  multy: true,
  resize: false,
});

exports.uploadPostMediaFiles = (imageName) =>
  uploadMedia({
    storage: "memoryStorage",
    upload: "any",
    filename: imageName,
  });

exports.createPost = asyncWrapper(async function (req, res, next) {
  const { newPost, tags } = await controllPostCreation(req);

  if (req.files) {
    // If multer storage is diskStorage use this
    // req?.files?.map((file) => file.filename);
    newPost.media = req.xOriginal.map(
      (fileName) => `${getServerHost()}/uploads/${fileName}`
    );
  }

  newPost.populate({
    path: "author tags.user",
    select: "userName profileImg",
  });

  await newPost.save();

  if (tags && JSON.parse(tags)[0])
    await controllCreatePostNotification({
      req,
      post: newPost,
      tags: JSON.parse(tags),
    });

  res.status(201).json(newPost);
});

exports.deletePost = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { postId } = req.params;

  const postToDelete = await Post.findById(postId);

  if (
    currUser.role !== "admin" &&
    postToDelete.author.toString() !== currUser.id
  )
    return next(new AppError(403, "you are not authorised for this operation"));

  const postMedia = postToDelete.media;

  if (!postToDelete.shared && postMedia?.[0])
    await controllPostMediaDeletion(postMedia, next);

  await postToDelete.delete();

  await Comment.deleteMany({ post: postToDelete._id });

  await Bookmarks.updateMany({ post: postId }, { $set: { deleted: true } });

  await Post.updateMany(
    { shared: true, authentic: postId },
    { $set: { deleted: true } }
  );

  res.status(204).json({ deleted: true });
});

exports.updatePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const post = await Post.findById(postId).select("-reactions -__v");

  if (!post) return next(new AppError(404, "post does not exists"));
  else if (post.author.toString() !== currUser.id)
    return next(new AppError(404, "you are not authorised for this operation"));

  const { body, newTags } = await controllPostUpdateBody({
    req,
    postType: post.type,
    existingTags: post.tags,
  });

  await controllPostMediaOnUpdate({ req, next, post });

  Object.keys(body).forEach((key) => (post[key] = body[key]));

  await post.save();

  await post.populate({
    path: "author tags.user",
    select: "userName profileImg",
  });

  await post.populate({
    path: "authentic",
    select: "-reactions -shared",
    populate: { path: "author tags", select: "userName profileImg" },
  });

  if (newTags && newTags[0])
    await controllCreatePostNotification({ req, post: post, tags: newTags });

  res.status(201).json(post);
});

exports.getPost = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { postId } = req.params;

  const userFriendShip = await Friendship.findOne({ user: currUser?.id });

  const post = await Post.findById(postId)
    .select("-reactions -__v")
    .populate({
      path: "author tags.user",
      select: "userName profileImg",
    })
    .populate({
      path: "authentic",
      select: "-reactions -shared -__v",
      transform: (doc, docId) => {
        checkIfIsFriendOnEach({ currUser, doc, docId, userFriendShip });
      },
      populate: { path: "author tags.user", select: "userName profileImg" },
    });

  if (!post) return next(new AppError(404, "post does not exists"));
  else if (currUser && currUser.role === "guest" && post.audience !== "public")
    return next(new AppError(403, "you are not authorised for this operation"));

  res.status(200).json(post);
});

exports.sharePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { description, audience, tags } = req.body;
  const currUser = req.user;

  const postToShare = await Post.findById(postId);

  const body = {
    shared: true,
    authentic: postToShare._id,
    type: "post",
    author: currUser.id,
    description: description,
  };

  contollAudience(body, audience, "post");

  if (tags && JSON.parse(tags))
    body.tags = JSON.parse(tags).map((tag) => ({ user: tag }));

  const newPost = await Post.create(body);

  await newPost.populate({
    path: "author tags.user",
    select: "userName profileImg",
  });

  await newPost.populate({
    path: "authentic",
    select: "-reactions -shared",
    populate: { path: "author tags.user", select: "userName profileImg" },
  });

  await controllSharePostNotification({ req, post: newPost, tags });

  res.status(201).json(newPost);
});

exports.savePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const existingBookmark = await Bookmarks.find({
    $or: [{ post: postId }, { cachedId: postId }],
  });

  const operation = {};

  if (!existingBookmark[0]) {
    await Bookmarks.create({
      post: postId,
      author: currUser.id,
    });

    operation.saved = true;
  } else if (existingBookmark[0]) {
    await Bookmarks.findByIdAndDelete(existingBookmark[0]._id);
    operation.removed = true;
  }

  res.status(201).json(operation);
});

exports.changePostAudience = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { audience } = req.body;
  const currUser = req.user;

  const post = await Post.findById([postId]);

  if (post.author.toString() !== currUser.id)
    return next(new AppError(403, "yoy are not authorized for this operation"));

  contollAudience(post, audience, post.type);

  await post.save();

  res.status(201).json({ audience: post.audience });
});

exports.reactOnPost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { reaction } = req.body;
  const currUser = req.user;

  const post = await Post.findById(postId);

  if (!post) return next(new AppError(404, "post does not exists"));

  await controllPostReaction({ post, currUserId: currUser.id, reaction });

  await post.save();

  res.status(200).json({
    likesAmount: post.likesAmount,
    dislikesAmount: post.dislikesAmount,
    reactions: post.reactions,
  });
});

exports.getPostComments = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;

  const post = await Post.findById(postId);

  if (!post) return next(new AppError(404, "post does not exists"));

  const comments = await Comment.find({ post: postId })
    .populate({
      path: "author tags replies.author replies.tags",
      select: "userName profileImg",
    })
    .sort({ createdAt: -1 });
  // .select('-reactions -replies.reactions');

  res.status(200).json(comments);
});

exports.isUserPost = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { postId } = req.params;

  const post = await Post.findById(postId);

  const bookmark = await Bookmarks.findOne({
    $or: [{ post: postId }, { cachedId: postId }],
    author: currUser.id,
  });

  if (!post && !bookmark)
    return next(new AppError(404, "post does not exists"));

  const info = {
    belongsToUser: post ? post.author.toString() === currUser.id : false,
    isBookmarked: (bookmark && true) || false,
    isTagged: post
      ? post.tags.map((tag) => tag.user.toString()).includes(currUser.id)
      : false,
  };

  if (info.isTagged)
    info.isTaggedAndIsVisible = !post.tags.find(
      (tag) => tag.user.toString() === currUser.id
    ).hidden;
  else if (info.belongsToUser) info.belongsToUserAndIsVisible = !post.hidden;

  res.status(200).json(info);
});