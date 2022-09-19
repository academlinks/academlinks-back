import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';

import fs from 'fs';
import { promisify } from 'util';

import { uploadMedia, editMedia } from '../lib/multer.js';

export const resizeAndOptimiseMedia = editMedia({
  multy: true,
  resize: false,
});

export const uploadPostMediaFiles = (imageName) =>
  uploadMedia({
    storage: 'memoryStorage',
    upload: 'any',
    filename: imageName,
  });

export const createPost = asyncWrapper(async function (req, res, next) {
  const { type, description } = req.body;
  const currUser = req.user;

  const newPost = new Post({
    type,
    author: currUser.id,
    description,
  });

  if (req.files) {
    // If multer storage is diskStorage use this
    // req?.files?.map((file) => file.filename);
    newPost.media = req.xOriginal.map(
      (fileName) => `${req.protocol}://${'localhost:4000'}/${fileName}`
      // `${req.protocol}://${req.host === '127.0.0.1' ? 'localhost:4000' : req.host}/${fileName}`
    );
  }

  newPost.populate({
    path: 'author',
    select: 'userName profileImg',
  });

  await newPost.save();

  res.status(201).json(newPost);
});

export const deletePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const postToDelete = await Post.findById(postId);

  if (postToDelete.author.toString() !== currUser.id)
    return next(new AppError(403, 'you are not authorised for this operation'));

  const postMedia = postToDelete.media;

  if (!postToDelete.shared && postMedia && postMedia.length > 0) {
    const deletion = promisify(fs.unlink);

    Promise.all(
      postMedia.map(async (media) => {
        try {
          const originalFileName = media.split('/')?.slice(3)[0];
          await deletion(`public/images/${originalFileName}`);
        } catch (error) {
          return next(
            new AppError(
              406,
              "something went wrong, cant't find and delete post media files which are attached to your post. please report the problem or try later"
            )
          );
        }
      })
    );
  }

  await Comment.deleteMany({ post: postToDelete._id });

  await postToDelete.delete();

  res.status(204).json({ deleted: true });
});

export const updatePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { description, media } = req.body;
  const currUser = req.user;

  const post = await Post.findById(postId).populate({
    path: 'author authenticAuthor reactions.author',
    select: 'userName profileImg',
  });

  if (!post || post.author._id.toString() !== currUser.id)
    return next(new AppError(404, 'post does not exists'));

  const deletion = promisify(fs.unlink);

  const existingFiles = post.media;
  const filteredMedia = [];
  if (!post.shared && existingFiles?.[0])
    Promise.all(
      existingFiles.map(async (file) => {
        try {
          if (!media?.includes(file)) {
            const originalFileName = file.split('/')?.slice(3)[0];
            await deletion(`public/images/${originalFileName}`);
          } else filteredMedia.push(file);
        } catch (error) {
          return next(
            new AppError(
              403,
              "something went wrong, cant't find and delete removed post media files which are attached to your post.  please report the problem or try later"
            )
          );
        }
      })
    );

  if (!post.shared && req.files) {
    const newFiles = req.xOriginal.map(
      (fileName) => `${req.protocol}://${'localhost:4000'}/${fileName}`
    );

    const modifiedExistingFiles = filteredMedia[0] ? filteredMedia : [];

    // const matchModifiedFilesToExisting = promisify(fs.existsSync);
    // const match = await matchModifiedFilesToExisting(`public/images/${originalFileName}`);

    post.media = [...modifiedExistingFiles, ...newFiles];
  } else if (!post.shared) post.media = media;

  if (description) post.description = description;

  await post.save();

  res.status(201).json(post);
});

export const reactOnPost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { reaction } = req.body;
  const currUser = req.user;

  const post = await Post.findById(postId);

  if (!post) return next(new AppError(404, 'post does not exists'));

  const existingReaction = post.reactions.find(
    (reaction) => reaction.author.toString() === currUser.id
  );

  if (existingReaction) {
    if (existingReaction.reaction === reaction)
      post.reactions = post.reactions.filter(
        (reaction) => reaction.author.toString() !== currUser.id
      );
    else if (existingReaction.reaction !== reaction) existingReaction.reaction = reaction;
  } else
    post.reactions.push({
      reaction,
      author: currUser.id,
    });

  await post.save();

  res.status(200).json({
    reactions: post.reactions,
    likesAmount: post.likesAmount,
    dislikesAmount: post.dislikesAmount,
  });
});

export const getPostComments = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;

  const post = await Post.findById(postId);

  if (!post) return next(new AppError(404, 'post does not exists'));

  const comments = await Comment.find({ post: postId })
    .populate({
      path: 'author tags reactions.author replies.author replies.reactions.author replies.tags',
      select: 'userName profileImg',
    })
    .sort({ createdAt: -1 });

  res.status(200).json(comments);
});

export const sharePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { description } = req.body;
  const currUser = req.user;

  const postToShare = await Post.findById(postId);

  const sharedPost = {
    type: 'post',
    author: currUser.id,
    description: description,
    media: postToShare.media,
    shared: true,
    authenticType: postToShare.shared ? postToShare.authenticType : postToShare.type,
    authenticAuthor: postToShare.shared ? postToShare.authenticAuthor : postToShare.author,
    authenticDescription: postToShare.shared
      ? postToShare.authenticDescription
      : postToShare.description,
    authenticDateCreation: postToShare.shared
      ? postToShare.authenticDateCreation
      : postToShare.createdAt,
  };

  const newPost = await Post.create(sharedPost);

  await newPost.populate({
    path: 'author authenticAuthor',
    select: 'userName profileImg',
  });

  res.status(201).json(newPost);
});

export const getPost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;

  const post = await Post.findById(postId)
    .populate({ path: 'author', select: 'userName profileImg' })
    .populate({ path: 'authenticAuthor', select: 'userName profileImg' });

  if (!post) return next(new AppError(404, 'post does not exists'));

  res.status(200).json(post);
});

/////////////////////////////////////////////////////////////////////

export const getAllPosts = asyncWrapper(async function (req, res, next) {
  const posts = await Post.find()
    .populate('author')
    .populate({
      path: 'authenticAuthor',
      select: 'userName email _id',
    })
    .populate({
      path: 'comments',
      populate: { path: 'author replies.author replies.adressat' },
    });

  res.status(200).json();
});

//////////////////////////////////////////////////////////////////////
export const fnName = asyncWrapper(async function (req, res, next) {});
