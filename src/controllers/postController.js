import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import fs from 'fs';
import { promisify } from 'util';

import { uploadMedia, editMedia } from '../lib/multer.js';

export const uploadImages = uploadMedia({
  storage: 'memoryStorage',
  upload: 'any',
  filename: 'images',
});

export const resizeAndOptimiseMedia = editMedia({
  multy: true,
  resize: false,
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

  res.status(200).json(newPost);
});

export const deletePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const postToDelete = await Post.findById(postId);

  if (postToDelete.author.toString() !== currUser.id)
    return next(new AppError(403, 'you are not authorised for this operation'));

  const postMedia = postToDelete.media;

  if (postMedia && postMedia.length > 0) {
    const deletion = promisify(fs.unlink);

    Promise.all(
      postMedia.map(async (media) => {
        try {
          const originalFileName = media.split('/')?.slice(3)[0];
          await deletion(`public/images/${originalFileName}`);
        } catch (error) {
          return next(
            new AppError(
              403,
              "something went wrong, cant't delete post media files please try again"
            )
          );
        }
      })
    );
  }

  await postToDelete.delete();

  res.status(204).json({ deleted: true });
});

// export const checkFileExistence = asyncWrapper(async function (req, res, next) {
//   console.log(req.files);
//   if (!req.files) return next();

//   const originalFileNames = req.files.map((file) => file.split('/')?.slice(3)[0]);

//   const checkFileExistence = promisify(fs.existsSync);

//   const newFiles = originalFileNames.filter(file=>)

// });

export const updatePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { description } = req.body;
  const currUser = req.user;

  const post = await Post.findById(postId);

  if (!post || postId.author.toString() !== currUser.id)
    return next(new AppError(404, 'post does not exists'));

  //

  rs.status(200).json('testing');
});

export const reactOnPost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { reaction } = req.body;
  const currUser = req.user;

  const post = await Post.findById(postId);

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

  const comments = await Comment.find({ post: postId })
    .populate({
      path: 'author',
      select: 'userName profileImg',
    })
    .populate({
      path: 'tags',
      select: 'userName profileImg',
    })
    .populate({
      path: 'reactions.author',
      select: 'userName profileImg',
    })
    .populate({
      path: 'replies.author',
      select: 'userName profileImg',
    })
    .populate({
      path: 'replies.reactions.author',
      select: 'userName profileImg',
    })
    .populate({
      path: 'replies.tags',
      select: 'userName profileImg',
    })
    .sort({ createdAt: -1 });

  res.status(200).json(comments);
});

/////////////////////////////////////////////////////////////////////
export const getPost = asyncWrapper(async function (req, res, next) {
  const post = await Post.findById(postId).populate('author').populate('authenticAuthor');

  if (!post) throw new Error('there are no such a post');

  res.status(200).json();
});

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

export const sharePost = asyncWrapper(async function (req, res, next) {
  const postToShare = await Post.findById(postId);

  const sharedPost = {
    type: 'post',
    author: currUser.id,
    description: description,
    media: postToShare.media,
    shared: true,
    authenticType: postToShare.type,
    authenticAuthor: postToShare.author,
    authenticDescription: postToShare.description,
    authenticDateCreation: postToShare.createdAt,
  };

  const newPost = await Post.create(sharedPost);

  res.status(200).json();
});

//////////////////////////////////////////////////////////////////////
export const fnName = asyncWrapper(async function (req, res, next) {});
