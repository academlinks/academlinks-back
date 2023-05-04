const { Post, Comment } = require("../models");
const { AppError, asyncWrapper } = require("../lib");
const { CommentUtils } = require("../utils/comments");
const { OnCommentNotification } = require("../utils/notifications");

exports.addComment = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { postId } = req.params;

  const { text, tags } = CommentUtils.checkCommentBody({ req, next });

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

  await OnCommentNotification.sendNotificationOnAddComment({
    req,
    post,
    comment,
  });

  res.status(200).json(comment);
});

exports.addCommentReply = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { text, tags } = CommentUtils.checkCommentBody({ req, next });

  const { comment, post } = await CommentUtils.checkPostAndCommentExistance({
    req,
    next,
  });

  comment.replies = [...comment.replies, { tags, text, author: currUser.id }];
  comment.repliesAmount += 1;
  await comment.save();

  post.commentsAmount = post.commentsAmount += 1;
  await post.save();

  await comment.populate({
    path: "replies.author replies.tags",
    select: "userName profileImg",
  });

  const commentReply = comment.replies[comment.replies.length - 1];

  await OnCommentNotification.sendNotificationOnAddComment({
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

  const { text, tags } = CommentUtils.checkCommentBody({ req, next });

  const { comment, post } = await CommentUtils.checkPostAndCommentExistance({
    req,
    next,
  });

  if (comment.author.toString() !== currUser.id)
    return next(new AppError(404, "you are not authorized for this operation"));

  const newTags = tags.filter((tag) => !comment.tags.includes(tag));

  comment.text = text;
  comment.tags = tags;

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
    await OnCommentNotification.sendNotificationOnUpdateComment({
      req,
      post,
      comment,
      newTags,
    });

  res.status(200).json(updatedComment);
});

exports.updateCommentReply = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { text, tags } = CommentUtils.checkCommentBody({ req, next });

  const { comment, post } = await CommentUtils.checkPostAndCommentExistance({
    req,
    next,
  });

  const { commentReply } = CommentUtils.checkCommentReplyExistance({
    req,
    next,
    comment,
  });

  if (commentReply.author.toString() !== currUser.id)
    return next(new AppError(404, "you are not authorized for this operation"));

  const newTags = tags.filter((tag) => !commentReply.tags.includes(tag));

  commentReply.text = text;
  commentReply.tags = tags;

  await comment.populate({
    path: "replies.author replies.tags",
    select: "userName profileImg",
  });

  await comment.save();

  const updatedCommentReply = {
    text: commentReply.text,
    tags: commentReply.tags,
  };

  if (newTags[0])
    await OnCommentNotification.sendNotificationOnUpdateComment({
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

  const { comment, post } = await CommentUtils.checkPostAndCommentExistance({
    req,
    next,
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

  const { comment, post } = await CommentUtils.checkPostAndCommentExistance({
    req,
    next,
  });

  const { commentReply } = CommentUtils.checkCommentReplyExistance({
    req,
    next,
    comment,
  });

  if (
    currUser.role !== "admin" &&
    currUser.id !== commentReply.author.toString() &&
    currUser.id !== post.author.toString()
  )
    return next(new AppError(404, "you are not authorized for this operation"));

  comment.replies = comment.replies.filter(
    (reply) => reply._id.toString() !== commentReply._id.toString()
  );

  comment.repliesAmount = comment.repliesAmount - 1;
  post.commentsAmount = post.commentsAmount - 1;

  await comment.save();
  await post.save();

  res.status(204).json({ deleted: true });
});

exports.reactOnComment = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { comment } = await CommentUtils.checkCommentExistance({ req, next });

  CommentUtils.manageCommentReaction({ currUser, comment });

  await comment.save();

  res
    .status(200)
    .json({ likesAmount: comment.likesAmount, reactions: comment.reactions });
});

exports.reactOnCommentReply = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { comment } = await CommentUtils.checkCommentExistance({ req, next });

  const { commentReply } = CommentUtils.checkCommentReplyExistance({
    req,
    next,
    comment,
  });

  CommentUtils.manageCommentReaction({ currUser, comment: commentReply });

  comment.controllCommentReplyLikes(commentReply._id);

  await comment.save();

  res.status(200).json({
    likesAmount: commentReply.likesAmount,
    reactions: commentReply.reactions,
  });
});

exports.pinComment = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { comment, post } = await CommentUtils.checkPostAndCommentExistance({
    req,
    next,
  });

  if (post.author._id.toString() !== currUser.id)
    return next(new AppError(400, "you are not authorized for this operation"));

  comment.pin = !comment.pin;
  await comment.save();

  res.status(200).json({ pin: comment.pin });
});

exports.pinCommentReply = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { comment, post } = await CommentUtils.checkPostAndCommentExistance({
    req,
    next,
  });

  if (post.author._id.toString() !== currUser.id)
    return next(new AppError(404, "you are not authorized for this operation"));

  const { commentReply } = CommentUtils.checkCommentReplyExistance({
    req,
    next,
    comment,
  });

  commentReply.pin = !commentReply.pin;
  await comment.save();

  res.status(200).json({ pin: commentReply.pin });
});
