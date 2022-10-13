import mongoose from 'mongoose';

import { uploadMedia, editMedia } from '../lib/multer.js';

import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Bookmarks from '../models/Bookmarks.js';

import {
  contollAudience,
  controllPostCreation,
  controllPostMediaDeletion,
  controllPostUpdateBody,
  controllPostMediaOnUpdate,
  controllPostReaction,
} from '../utils/postControllerUtils.js';

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
  const newPost = await controllPostCreation(req);

  if (req.files) {
    // If multer storage is diskStorage use this
    // req?.files?.map((file) => file.filename);
    newPost.media = req.xOriginal.map(
      (fileName) => `${req.protocol}://${'localhost:4000'}/${fileName}`
      // `${req.protocol}://${req.host === '127.0.0.1' ? 'localhost:4000' : req.host}/${fileName}`
    );
  }

  newPost.populate({
    path: 'author tags',
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

  if (!postMedia.shared && postMedia?.[0]) await controllPostMediaDeletion(postMedia, next);

  await postToDelete.delete();

  await Comment.deleteMany({ post: postToDelete._id });

  await Bookmarks.updateMany({ post: postId }, { $set: { deleted: true } });

  await Post.updateMany({ shared: true, authentic: postId }, { $set: { deleted: true } });

  res.status(204).json({ deleted: true });
});

export const updatePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const post = await Post.findById(postId).select('-reactions -__v');

  if (!post) return next(new AppError(404, 'post does not exists'));

  if (post.author._id.toString() !== currUser.id)
    return next(new AppError(404, 'you are not authorised for this operation'));

  const body = await controllPostUpdateBody({ req, postType: post.type });

  await controllPostMediaOnUpdate({ req, next, post });

  Object.keys(body).forEach((key) => (post[key] = body[key]));

  await post.save();

  await post.populate({
    path: 'author tags',
    select: 'userName profileImg',
  });

  await post.populate({
    path: 'authentic',
    select: '-reactions -shared',
    populate: { path: 'author tags', select: 'userName profileImg' },
  });

  res.status(201).json(post);
});

export const sharePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { description, audience, tags } = req.body;
  const currUser = req.user;

  const postToShare = await Post.findById(postId);

  const body = {
    shared: true,
    authentic: postToShare._id,
    type: 'post',
    author: currUser.id,
    description: description,
  };

  contollAudience(body, audience, 'post');

  if (tags && JSON.parse(tags)) body.tags = JSON.parse(tags);

  const newPost = await Post.create(body);

  await newPost.populate({
    path: 'author tags',
    select: 'userName profileImg',
  });

  await newPost.populate({
    path: 'authentic',
    select: '-reactions -shared',
    populate: { path: 'author tags', select: 'userName profileImg' },
  });

  res.status(201).json(newPost);
});

export const savePost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const existingBookmark = await Bookmarks.find({ $or: [{ post: postId }, { cachedId: postId }] });

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

export const changePostAudience = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { audience } = req.body;
  const currUser = req.user;

  const post = await Post.findById([postId]);

  if (post.author.toString() !== currUser.id)
    return next(new AppError(403, 'yoy are not authorized for this operation'));

  contollAudience(post, audience, post.type);

  await post.save();

  res.status(201).json({ audience: post.audience });
});

export const reactOnPost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { reaction } = req.body;
  const currUser = req.user;

  const post = await Post.findById(postId);

  if (!post) return next(new AppError(404, 'post does not exists'));

  await controllPostReaction({ post, currUserId: currUser.id, reaction });

  await post.save();

  res.status(200).json({
    likesAmount: post.likesAmount,
    dislikesAmount: post.dislikesAmount,
  });
});

export const getPost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const post = await Post.findById(postId).select('-reactions -__v').populate({
    path: 'author tags',
    select: 'userName profileImg',
  });

  if (!post) return next(new AppError(404, 'post does not exists'));
  else if (currUser.role === 'guest' && post.audience !== 'public')
    return next(new AppError(403, 'you are not authorised for this operation'));

  res.status(200).json(post);
});

export const getBlogPosts = asyncWrapper(async function (req, res, next) {
  const { page, limit, hasMore, author, category } = req.query;
  const currUser = req.user;

  const skip = page * limit - limit;

  const postQuery = {
    type: 'blogPost',
    [author ? 'author' : '']: author ? author : '',
    [category ? 'categories' : '']: category ? { $in: category.split(',') } : '',
  };

  if (currUser.role === 'guest') postQuery.audience = 'public';

  let postsLength;
  if (hasMore && !JSON.parse(hasMore)) postsLength = await Post.find(postQuery).countDocuments();

  const blogPosts = await Post.find(postQuery)
    .select('-reactions -__v')
    .skip(skip)
    .limit(limit)
    .sort('-createdAt')
    .populate({
      path: 'author tags reactions.author',
      select: 'userName profileImg',
    });

  res.status(200).json({ data: blogPosts, results: postsLength });
});

export const getPostComments = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;

  const post = await Post.findById(postId);

  if (!post) return next(new AppError(404, 'post does not exists'));

  const comments = await Comment.find({ post: postId })
    .populate({
      path: 'author tags replies.author replies.tags',
      select: 'userName profileImg',
    })
    .sort({ createdAt: -1 })
    .select('-reactions -replies.reactions');

  res.status(200).json(comments);
});

export const isUserPost = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const currUser = req.user;

  const post = await Post.findById(postId);

  const bookmark = await Bookmarks.find({ $or: [{ post: postId }, { cachedId: postId }] });

  if (!post && !bookmark[0]) return next(new AppError(404, 'post does not exists'));

  const info = {
    belongsToUser: post?.author.toString() === currUser.id,
    isBookmarked: bookmark[0]?.cachedId === postId && bookmark[0]?.author === currUser.id,
  };

  res.status(200).json(info);
});

export const getTopRatedBlogPosts = asyncWrapper(async function (req, res, next) {
  const { limit } = req.query;
  const monthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1));

  const posts = await Post.find({
    type: 'blogPost',
    createdAt: { $gte: monthAgo },
  })
    .select('-reactions -__v')
    .sort('-likesAmount')
    .limit(limit)
    .populate({
      path: 'author tags',
      select: 'userName profileImg',
    });

  res.status(200).json(posts);
});

export const getTopRatedPublishers = asyncWrapper(async function (req, res, next) {
  const { limit } = req.query;

  const topRatedPublishers = await Post.aggregate([
    {
      $match: { type: 'blogPost' },
    },
    {
      $project: { author: 1, likesAmount: 1 },
    },
    {
      $group: {
        _id: '$author',
        posts: { $sum: 1 },
        likes: { $sum: '$likesAmount' },
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
        as: 'author',
        from: 'users',
        foreignField: '_id',
        localField: '_id',
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
      $unwind: '$author',
    },
  ]);

  res.status(200).json(topRatedPublishers);
});

export const getRelatedPosts = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { limit } = req.query;

  const { categories } = await Post.findById(postId).select('categories');

  const posts = await Post.aggregate([
    {
      $match: {
        type: 'blogPost',
        categories: { $in: categories },
        _id: { $ne: mongoose.Types.ObjectId(postId) },
      },
    },
    {
      $addFields: {
        matched: { $setIntersection: ['$categories', categories] },
      },
    },
    {
      $unwind: '$matched',
    },
    {
      $group: {
        _id: '$_id',
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
        as: 'posts',
        from: 'posts',
        foreignField: '_id',
        localField: '_id',
        pipeline: [
          {
            $lookup: {
              as: 'author',
              from: 'users',
              foreignField: '_id',
              localField: 'author',
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
              as: 'tags',
              from: 'users',
              foreignField: '_id',
              localField: 'tags',
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
      $unwind: '$posts',
    },
    {
      $unset: ['posts.reactions'],
    },
    {
      $unwind: '$posts.author',
    },
  ]);

  const relatedPosts = posts.map((post) => post.posts);

  res.status(200).json(relatedPosts);
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

// check separated populatio on share post and updatePost
