import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import Post from '../models/Post.js';
import Comment from '../models/Comment.js';

import { controllCommentAccess } from '../utils/commentControllerUtils.js';

export const addComment = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { text, tags } = req.body;
  const currUser = req.user;

  if (!text) return next(new AppError(400, "text field can't be empty"));

  const updatedPost = await Post.findByIdAndUpdate(postId, {
    $inc: { commentsAmount: 1 },
  });

  if (!updatedPost) return next(new AppError(400, 'there are no such a post'));

  const comment = await Comment.create({ post: postId, text, author: currUser.id, tags });

  await comment.populate({
    path: 'author tags',
    select: 'userName profileImg',
  });

  res.status(200).json(comment);
});

export const addCommentReply = asyncWrapper(async function (req, res, next) {
  const { text, tags } = req.body;
  const currUser = req.user;

  const { post, comment } = await controllCommentAccess({ req, next });

  comment.replies = [...comment.replies, { tags, text, author: currUser.id }];
  comment.repliesAmount += 1;

  await comment.populate({
    path: 'replies.author replies.tags',
    select: 'userName profileImg',
  });

  await comment.save();

  post.commentsAmount = post.commentsAmount += 1;
  await post.save();

  const newCommentReply = comment.replies[comment.replies.length - 1];

  res.status(200).json(newCommentReply);
});

export const updateComment = asyncWrapper(async function (req, res, next) {
  const { text, tags } = req.body;
  const currUser = req.user;

  const { comment } = await controllCommentAccess({ req, next });

  if (comment.author.toString() !== currUser.id)
    return next(new AppError(404, 'you are not authorized for this operation'));

  comment.text = text;
  comment.tags = tags;

  await comment.populate({
    path: 'tags',
    select: 'userName profileImg',
  });

  await comment.save();

  const updatedComment = {
    text: comment.text,
    tags: comment.tags,
  };

  res.status(200).json(updatedComment);
});

export const updateCommentReply = asyncWrapper(async function (req, res, next) {
  const { text, tags } = req.body;
  const currUser = req.user;

  const { comment, commentReply } = await controllCommentAccess({
    req,
    next,
    checkReplyAccess: true,
  });

  if (commentReply.author.toString() !== currUser.id)
    return next(new AppError(404, 'you are not authorized for this operation'));

  commentReply.text = text;
  commentReply.tags = tags;

  await comment.populate({
    path: 'replies.tags',
    select: 'userName',
  });

  await comment.save();

  const updatedCommentReply = {
    text: commentReply.text,
    tags: commentReply.tags,
  };

  res.status(200).json(updatedCommentReply);
});

export const deleteComment = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { post, comment } = await controllCommentAccess({ req, next, checkBody: false });

  if (comment.author.toString() !== currUser.id)
    return next(new AppError(404, 'you are not authorized for this operation'));

  post.commentsAmount = post.commentsAmount - (comment.repliesAmount + 1);

  await comment.delete();
  await post.save();

  res.status(204).json({ deleted: true });
});

export const deleteCommentReply = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { post, comment, commentReply } = await controllCommentAccess({
    req,
    next,
    checkBody: false,
    checkReplyAccess: true,
  });

  if (commentReply.author.toString() !== currUser.id)
    return next(new AppError(404, 'you are not authorized for this operation'));

  comment.replies = comment.replies.filter(
    (rep) => rep._id.toString() !== commentReply._id.toString()
  );

  comment.repliesAmount = comment.repliesAmount - 1;
  post.commentsAmount = post.commentsAmount - 1;

  await comment.save();
  await post.save();

  res.status(204).json({ deleted: true });
});

export const reactOnComment = asyncWrapper(async function (req, res, next) {
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

  res.status(200).json({ likesAmount: comment.likesAmount });
});

export const reactOnCommentReply = asyncWrapper(async function (req, res, next) {
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

  res.status(200).json({ likesAmount: commentReply.likesAmount });
});

export const pinComment = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { post, comment } = await controllCommentAccess({
    req,
    next,
    checkBody: false,
  });

  if (post.author.toString() !== currUser.id)
    return next(new AppError(400, 'you are not authorized for this operation'));

  comment.pin = !comment.pin;

  await comment.save();

  res.status(200).json({ pin: comment.pin });
});

export const pinCommentReply = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const { post, comment, commentReply } = await controllCommentAccess({
    req,
    next,
    checkBody: false,
  });

  if (post.author.toString() !== currUser.id)
    return next(new AppError(404, 'you are not authorized for this operation'));

  commentReply.pin = !commentReply.pin;

  await comment.save();

  res.status(200).json({ pin: commentReply.pin });
});
