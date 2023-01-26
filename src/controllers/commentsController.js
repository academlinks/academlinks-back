const AppError = require("../lib/AppError.js");
const asyncWrapper = require("../lib/asyncWrapper.js");

const Post = require("../models/Post.js");
const Comment = require("../models/Comment.js");

const {
  controllAddCommentNotification,
  controllUpdateCommentNotification,
} = require("../utils/notificationControllerUtils.js");
const controllCommentAccess = require("../utils/commentControllerUtils.js");

exports.addComment = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { postId } = req.params;
  const { text, tags } = req.body;

  const post = await Post.findByIdAndUpdate(postId, {
    $inc: { commentsAmount: 1 },
  }).populate({ path: "author", select: "userName" });

  if (!post) return next(new AppError(400, "there are no such a post"));

  const comment = await Comment.create({
    post: postId,
    text,
    author: currUser.id,
    tags,
  });

  await comment.populate({
    path: "author tags",
    select: "userName profileImg",
  });

  await controllAddCommentNotification({ req, post, comment });

  res.status(200).json(comment);
});

exports.addCommentReply = asyncWrapper(async function (req, res, next) {
  const { text, tags } = req.body;
  const currUser = req.user;

  const { post, comment } = await controllCommentAccess({ req, next });

  comment.replies = [...comment.replies, { tags, text, author: currUser.id }];
  comment.repliesAmount += 1;

  await post.populate({
    path: "author",
    select: "userName",
  });

  await comment.populate({
    path: "replies.author replies.tags",
    select: "userName profileImg",
  });

  await comment.save();

  post.commentsAmount = post.commentsAmount += 1;
  await post.save();

  const commentReply = comment.replies[comment.replies.length - 1];

  await controllAddCommentNotification({
    req,
    post,
    comment: commentReply,
    parentCommentId: comment._id,
    parentCommentAuthor: comment.author.toString(),
  });

  res.status(200).json(commentReply);
});

exports.updateComment = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { text, tags } = req.body;

  const { comment, post } = await controllCommentAccess({ req, next });

  if (comment.author.toString() !== currUser.id)
    return next(new AppError(404, "you are not authorized for this operation"));

  const newTags = tags.filter((tag) => !comment.tags.includes(tag));

  comment.text = text;
  comment.tags = tags;

  await post.populate({
    path: "author",
    select: "userName",
  });

  await comment.populate({
    path: "tags",
    select: "userName",
  });

  await comment.save();

  const updatedComment = {
    text: comment.text,
    tags: comment.tags,
  };

  if (newTags[0])
    await controllUpdateCommentNotification({ req, post, comment, newTags });

  res.status(200).json(updatedComment);
});

exports.updateCommentReply = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { text, tags } = req.body;

  const { post, comment, commentReply } = await controllCommentAccess({
    req,
    next,
    checkReplyAccess: true,
  });

  if (commentReply.author.toString() !== currUser.id)
    return next(new AppError(404, "you are not authorized for this operation"));

  const newTags = tags.filter((tag) => !commentReply.tags.includes(tag));

  commentReply.text = text;
  commentReply.tags = tags;

  await post.populate({
    path: "author",
    select: "userName",
  });

  await comment.populate({
    path: "replies.tags",
    select: "userName",
  });

  await comment.save();

  const updatedCommentReply = {
    text: commentReply.text,
    tags: commentReply.tags,
  };

  if (newTags[0])
    await controllUpdateCommentNotification({
      req,
      post,
      comment: commentReply,
      parentCommentId: comment._id.toString(),
      newTags,
    });

  res.status(200).json(updatedCommentReply);
});

exports.deleteComment = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { post, comment } = await controllCommentAccess({
    req,
    next,
    checkBody: false,
  });

  if (
    currUser.role !== "admin" &&
    currUser.id !== comment.author.toString() &&
    currUser.id !== post.author.toString()
  )
    return next(new AppError(404, "you are not authorized for this operation"));

  post.commentsAmount = post.commentsAmount - (comment.repliesAmount + 1);

  await comment.delete();
  await post.save();

  res.status(204).json({ deleted: true });
});

exports.deleteCommentReply = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { post, comment, commentReply } = await controllCommentAccess({
    req,
    next,
    checkBody: false,
    checkReplyAccess: true,
  });

  if (
    currUser.role !== "admin" &&
    currUser.id !== commentReply.author.toString() &&
    currUser.id !== post.author.toString()
  )
    return next(new AppError(404, "you are not authorized for this operation"));

  comment.replies = comment.replies.filter(
    (rep) => rep._id.toString() !== commentReply._id.toString()
  );

  comment.repliesAmount = comment.repliesAmount - 1;
  post.commentsAmount = post.commentsAmount - 1;

  await comment.save();
  await post.save();

  res.status(204).json({ deleted: true });
});

exports.reactOnComment = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { comment } = await controllCommentAccess({
    req,
    next,
    checkBody: false,
  });

  const existingReaction = comment.reactions.find(
    (reaction) => reaction.author.toString() === currUser.id
  );

  if (existingReaction)
    comment.reactions = comment.reactions.filter(
      (reaction) => reaction.author._id !== existingReaction.author._id
    );
  else
    comment.reactions.push({
      reaction: true,
      author: currUser.id,
    });

  await comment.save();

  res
    .status(200)
    .json({ likesAmount: comment.likesAmount, reactions: comment.reactions });
});

exports.reactOnCommentReply = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;

  const { comment, commentReply } = await controllCommentAccess({
    req,
    next,
    checkBody: false,
    checkReplyAccess: true,
  });

  const existingReaction = commentReply.reactions.find(
    (reaction) => reaction.author.toString() === currUser.id
  );

  if (existingReaction)
    commentReply.reactions = commentReply.reactions.filter(
      (reaction) => reaction._id !== existingReaction._id
    );
  else
    commentReply.reactions.push({
      reaction: true,
      author: currUser.id,
    });

  comment.controllCommentReplyLikes(commentReply._id);

  await comment.save();

  res.status(200).json({
    likesAmount: commentReply.likesAmount,
    reactions: commentReply.reactions,
  });
});

exports.pinComment = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { post, comment } = await controllCommentAccess({
    req,
    next,
    checkBody: false,
  });

  if (post.author.toString() !== currUser.id)
    return next(new AppError(400, "you are not authorized for this operation"));

  comment.pin = !comment.pin;

  await comment.save();

  res.status(200).json({ pin: comment.pin });
});

exports.pinCommentReply = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { post, comment, commentReply } = await controllCommentAccess({
    req,
    next,
    checkBody: false,
  });

  if (post.author.toString() !== currUser.id)
    return next(new AppError(404, "you are not authorized for this operation"));

  commentReply.pin = !commentReply.pin;

  await comment.save();

  res.status(200).json({ pin: commentReply.pin });
});
