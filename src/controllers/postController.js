import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';

export const getProfilePosts = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;

  const posts = await Post.find({ author: userId })
    .populate({
      path: 'author',
      select: 'userName profileImg',
    })
    .populate({
      path: 'authenticAuthor',
      select: 'userName profileImg',
    })
    .populate({
      path: 'reactions.author',
      select: 'userName',
    });

  res.status(200).json(posts);
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
export const createPost = asyncWrapper(async function (req, res, next) {
  const newPost = new Post({
    type,
    author: currUser.id,
    description,
  });

  let mediaUrls;
  try {
    if (await media) mediaUrls = await filesUpload(media, currUser.id, newPost._id);
  } catch (error) {
    throw new Error(error.message);
  }

  newPost.media = mediaUrls;

  await newPost.save();

  res.status(200).json();
});
export const deletePost = asyncWrapper(async function (req, res, next) {
  const postToDelete = await Post.findById(postId);

  if (postToDelete.author.toString() === currUser.id) {
    const postMedia = postToDelete.media;

    if (postMedia && postMedia.length > 0) {
      const deletion = promisify(fs.unlink);
      Promise.all(
        postMedia.map(async (media) => {
          const originalFileName = media.split('/')?.slice(4)[0];
          await deletion(`public/images/${originalFileName}`);
        })
      );
    }

    await postToDelete.delete();
  } else throw new Error('you are not authorised for this operation');

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
export const updatePost = asyncWrapper(async function (req, res, next) {});
//////////////////////////////////////////////////////////////////////
export const fnName = asyncWrapper(async function (req, res, next) {});
