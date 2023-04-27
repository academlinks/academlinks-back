const mongoose = require("mongoose");

const asyncWrapper = require("../../lib/asyncWrapper.js");
const AppError = require("../../lib/AppError.js");

const { controllShowOnProfile } = require("../../utils/postControllerUtils.js");

const { Post } = require("../../models");

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
