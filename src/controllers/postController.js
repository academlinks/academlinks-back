const mongoose = require("mongoose");

const { uploadMedia, editMedia } = require("../lib/multer.js");

const AppError = require("../lib/AppError.js");
const asyncWrapper = require("../lib/asyncWrapper.js");

const Post = require("../models/Post.js");
const Comment = require("../models/Comment.js");
const Bookmarks = require("../models/Bookmarks.js");
const Friendship = require("../models/Friendship.js");

const {
  contollAudience,
  controllPostCreation,
  controllPostMediaDeletion,
  controllPostUpdateBody,
  controllPostMediaOnUpdate,
  controllPostReaction,
  controllShowOnProfile,
} = require("../utils/postControllerUtils.js");

const {
  controllCreatePostNotification,
  controllSharePostNotification,
} = require("../utils/notificationControllerUtils.js");

const { checkIfIsFriendOnEach } = require("../utils/userControllerUtils.js");

const { getServerHost } = require("../lib/getOrigins.js");

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
      (fileName) => `${getServerHost()}/${fileName}`
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

exports.getPost = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { postId } = req.params;

  const userFriendShip = await Friendship.findOne({ user: currUser.id });

  const post = await Post.findById(postId)
    .select("-reactions -__v")
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
    });

  if (!post) return next(new AppError(404, "post does not exists"));
  else if (currUser.role === "guest" && post.audience !== "public")
    return next(new AppError(403, "you are not authorised for this operation"));

  res.status(200).json(post);
});

exports.getBlogPosts = asyncWrapper(async function (req, res, next) {
  const { page, limit, hasMore, author, category } = req.query;

  const skip = page * limit - limit;

  const postQuery = {
    type: "blogPost",
  };

  if (category) postQuery.category = { $in: category.split(",") };
  if (author) postQuery.author = author;

  // if (currUser.role === "guest") postQuery.audience = "public";

  let postsLength;
  if (hasMore && !JSON.parse(hasMore))
    postsLength = await Post.find(postQuery).countDocuments();

  const blogPosts = await Post.find(postQuery)
    .select("-reactions -__v")
    .skip(skip)
    .limit(limit)
    .sort("-createdAt")
    .populate({
      path: "author tags.user reactions.author",
      select: "userName profileImg",
    });

  res.status(200).json({ data: blogPosts, results: postsLength });
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

exports.removeTagFromPost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const post = await Post.findOneAndUpdate(
    {
      _id: mongoose.Types.ObjectId(postId),
      "tags.user": mongoose.Types.ObjectId(currUser.id),
    },
    { $pull: { tags: { user: mongoose.Types.ObjectId(currUser.id) } } },
    { new: true }
  ).populate({ path: "tags.user", select: "userName profileImg" });

  if (!post) return next(new AppError(404, "post does not exists"));

  res.status(200).json({ removed: true, postId, tags: post.tags });
});

exports.reviewTaggedPosts = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { show } = req.body;
  const currUser = req.user;

  const post = await Post.findOne({ _id: postId, "tags.user": currUser.id });

  if (!post) return next(new AppError(404, "there are no such a post"));

  const i = post.tags.findIndex((tag) => tag.user.toString() === currUser.id);
  post.tags[i].review = true;
  post.tags[i].hidden = !show;

  await post.save();

  res.status(201).json({ updated: true });
});

exports.addPostToProfile = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const post = await Post.findOne({
    _id: postId,
    $and: [
      {
        $or: [
          { author: currUser.id, hidden: true },
          {
            "tags.user": currUser.id,
            "tags.review": true,
            "tags.hidden": true,
          },
        ],
      },
    ],
  });

  if (!post) return next(new AppError(404, "post does not exists"));

  await controllShowOnProfile({ currUser, post, task: "add" });

  await post.save();

  res.status(201).json({ updated: true });
});

exports.hidePostFromProfile = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const post = await Post.findOne({
    _id: postId,
    $and: [
      {
        $or: [
          { author: currUser.id, hidden: false },
          {
            "tags.user": currUser.id,
            "tags.review": true,
            "tags.hidden": false,
          },
        ],
      },
    ],
  });

  if (!post) return next(new AppError(404, "post does not exists"));

  await controllShowOnProfile({ currUser, post, task: "hide" });

  await post.save();

  res.status(201).json({ updated: true });
});

exports.getTopRatedBlogPosts = asyncWrapper(async function (req, res, next) {
  const { limit } = req.query;
  const monthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1));

  const posts = await Post.find({
    type: "blogPost",
    createdAt: { $gte: monthAgo },
  })
    .select("-reactions -__v")
    .sort("-likesAmount")
    .limit(limit)
    .populate({
      path: "author tags.user",
      select: "userName profileImg",
    });

  res.status(200).json(posts);
});

exports.getTopRatedPublishers = asyncWrapper(async function (req, res, next) {
  const { limit } = req.query;

  const topRatedPublishers = await Post.aggregate([
    {
      $match: { type: "blogPost" },
    },
    {
      $project: { author: 1, likesAmount: 1 },
    },
    {
      $group: {
        _id: "$author",
        posts: { $sum: 1 },
        likes: { $sum: "$likesAmount" },
      },
    },
    {
      $sort: { likes: -1 },
    },
    {
      $limit: +limit || 3,
    },
    {
      $lookup: {
        as: "author",
        from: "users",
        foreignField: "_id",
        localField: "_id",
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
      $unwind: "$author",
    },
  ]);

  res.status(200).json(topRatedPublishers);
});

exports.getRelatedPosts = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { limit } = req.query;

  const { labels, category } = await Post.findById(postId).select(
    "labels category"
  );

  const posts = await Post.aggregate([
    {
      $match: {
        type: "blogPost",
        labels: { $in: labels },
        // category: category,
        _id: { $ne: mongoose.Types.ObjectId(postId) },
      },
    },
    {
      $addFields: {
        matched: { $setIntersection: ["$labels", labels] },
      },
    },
    {
      $unwind: "$matched",
    },
    {
      $group: {
        _id: "$_id",
        size: { $sum: 1 },
      },
    },
    {
      $sort: { size: -1 },
    },
    {
      $limit: +limit,
    },
    {
      $lookup: {
        as: "posts",
        from: "posts",
        foreignField: "_id",
        localField: "_id",
        pipeline: [
          {
            $lookup: {
              as: "author",
              from: "users",
              foreignField: "_id",
              localField: "author",
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
            $lookup: {
              as: "tags",
              from: "users",
              foreignField: "_id",
              localField: "tags.user",
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
        ],
      },
    },
    {
      $unwind: "$posts",
    },
    {
      $unset: ["posts.reactions"],
    },
    {
      $unwind: "$posts.author",
    },
  ]);

  const relatedPosts = posts.map((post) => post.posts);

  res.status(200).json(relatedPosts);
});

/////////////////////////////////////////////////////////////////////

// export const getAllPosts = asyncWrapper(async function (req, res, next) {
//   const posts = await Post.find()
//     .populate("author")
//     .populate({
//       path: "authenticAuthor",
//       select: "userName email _id",
//     })
//     .populate({
//       path: "comments",
//       populate: { path: "author replies.author replies.adressat" },
//     });

//   res.status(200).json();
// });

//////////////////////////////////////////////////////////////////////
// export const fnName = asyncWrapper(async function (req, res, next) {});
