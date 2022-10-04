import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import Post from '../models/Post.js';
import User from '../models/User.js';
import Bookmarks from '../models/Bookmarks.js';

import mongoose from 'mongoose';
import fs from 'fs';
import { promisify } from 'util';

import { uploadMedia, editMedia } from '../lib/multer.js';

export const resizeAndOptimiseMedia = editMedia({
  multy: false,
  resize: false,
});

export const uploadUserProfileFile = (imageName) =>
  uploadMedia({
    storage: 'memoryStorage',
    upload: 'single',
    filename: imageName,
  });

export const updateProfileImage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const user = await User.findById(currUser.id);

  const existingProfileImg = user.profileImg;
  const originalFileNameFragments = existingProfileImg.split('/')?.slice(3);

  async function deleteExistingImage() {
    try {
      const deletion = promisify(fs.unlink);
      await deletion(`public/images/${originalFileNameFragments[0]}`);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  let mediaUrl;
  try {
    if (!originalFileNameFragments[1] && originalFileNameFragments[1] !== 'profile-default.jpg')
      await deleteExistingImage();
    mediaUrl = `${req.protocol}://${'localhost:4000'}/${req.xOriginal}`;
  } catch (error) {
    return next(
      new AppError(
        406,
        "something went wrong, cant't find and delete your existing profile images. please report the problem or try later"
      )
    );
  }

  user.profileImg = mediaUrl;

  await user.save();

  res.status(201).json(mediaUrl);
});

export const updateCoverImage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  const user = await User.findById(currUser.id);

  const existingProfileImg = user.coverImg;
  const originalFileNameFragments = existingProfileImg.split('/')?.slice(3);

  async function deleteExistingImage() {
    try {
      const deletion = promisify(fs.unlink);
      await deletion(`public/images/${originalFileNameFragments[0]}`);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  let mediaUrl;
  try {
    if (!originalFileNameFragments[1] && originalFileNameFragments[1] !== 'cover-default.webp')
      await deleteExistingImage();
    mediaUrl = `${req.protocol}://${'localhost:4000'}/${req.xOriginal}`;
  } catch (error) {
    return next(
      new AppError(
        406,
        "something went wrong, cant't find and delete your existing cover images. please report the problem or try later"
      )
    );
  }

  user.coverImg = mediaUrl;

  await user.save();

  res.status(201).json(mediaUrl);
});

export const searchUsers = asyncWrapper(async function (req, res, next) {
  const { key } = req.query;

  const users = await User.find({ userName: { $regex: key } }).select('userName profileImg');

  res.status(200).json(users);
});

export const getUserProfile = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;

  const user = await User.findById(userId)
    .select(
      '-sentRequests -pendingRequests -education -workplace.description -workplace.workingYears'
    )
    .populate({
      path: 'friends.friend',
      select: 'userName profileImg',
      options: { limit: 9 },
    });

  const userProfile = {
    ...user._doc,
    workplace: user._doc.workplace[0],
    friends: user._doc.friends.slice(0, 9).map((fr) => fr.friend),
  };

  res.status(200).json(userProfile);
});

export const getProfilePosts = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { page, limit, hasMore } = req.query;

  const skip = page * limit - limit;

  const postQuery = { author: userId, type: 'post' };

  const user = await User.findById(currUser.id);
  const info = checkIfIsFriend(user, userId);

  if (userId !== currUser.id) {
    if (info.isFriend) postQuery.audience = { $in: ['friends', 'public'] };
    else postQuery.audience = 'public';
  }

  let postsLength;
  if (hasMore && !JSON.parse(hasMore)) postsLength = await Post.find(postQuery).countDocuments();

  const posts = await Post.find(postQuery)
    .select('-reactions -__v')
    .skip(skip)
    .limit(limit)
    .sort('-createdAt')
    .populate({
      path: 'author reactions.author tags',
      select: 'userName profileImg',
    })
    .populate({
      path: 'authentic',
      select: '-reactions -shared -__v',
      // transform: (doc, id) => checkIfIsFriendOnEach(user, doc.author._id.toString(), doc),
      populate: { path: 'author tags', select: 'userName profileImg' },
    });

  res.status(200).json({ data: posts, results: postsLength });
});

export const getUserFeed = asyncWrapper(async function (req, reqs, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { page, limit, hasMore } = req.query;

  if (currUser.id !== userId)
    return next(new AppError(401, 'you are not authorized for this operation'));

  const user = await User.findById(userId);
  if (!user) return next(new AppError(404, 'there are no such an user'));

  const friends = user.friends.map((friend) => friend.friend);

  const skip = page * limit - limit;

  const postQuery = {
    $or: [{ author: userId }, { author: friends }],
    type: 'post',
    audience: { $in: ['public', 'friends'] },
  };

  let postsLength;
  if (hasMore && !JSON.parse(hasMore)) postsLength = await Post.find(postQuery).countDocuments();

  const feedPosts = await Post.find(postQuery)
    .select('-reactions -__v')
    .skip(skip)
    .limit(limit)
    .sort('-createdAt')
    .populate({
      path: 'author tags',
      select: 'userName profileImg',
    })
    .populate({
      path: 'authentic',
      select: '-reactions -__v -shared',
      transform: (doc, id) => checkIfIsFriendOnEach(user, doc.author._id.toString(), doc),
      populate: { path: 'author tags', select: 'userName profileImg' },
    });

  reqs.status(200).json({ data: feedPosts, results: postsLength });
});

export const getBookmarks = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { page, limit, hasMore } = req.query;

  const skip = page * limit - limit;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorizd for this operation'));

  let postsLength;
  if (hasMore && !JSON.parse(hasMore))
    postsLength = await Bookmarks.find({ author: userId }).countDocuments();

  const user = await User.findById(userId);

  const savedPosts = await Bookmarks.find({ author: userId })
    .skip(skip)
    .limit(limit)
    .sort('-createdAt')
    .populate({
      path: 'post',
      select: '-reactions -__v',
      transform: (doc, id) => checkIfIsFriendOnEach(user, doc.author._id.toString(), doc),
      populate: [
        { path: 'author tags', select: 'userName profileImg' },
        {
          path: 'authentic',
          select: '-reactions -__v',
          transform: (doc, id) => checkIfIsFriendOnEach(user, doc.author._id.toString(), doc),
          populate: {
            path: 'tags author',
            select: 'userName profileImg',
          },
        },
      ],
    });

  res.status(200).json({ data: savedPosts, results: postsLength });
});

export const isFriend = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const user = await User.findById(currUser.id);

  const info = await checkIfIsFriend(user, userId);

  res.status(200).json(info);
});

export const getUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;

  const user = await User.findById(userId).select(
    'birthDate from currentLivingPlace createdAt workplace education gender email'
  );

  res.status(200).json(user);
});

export const addUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const data = req.body;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorizd for this operation'));

  const dataToAdd = Object.keys(data)[0];

  const availableUpdates = [
    'education',
    'workplace',
    'birthDate',
    'currentLivingPlace',
    'gender',
    'from',
  ];

  if (!availableUpdates.includes(dataToAdd))
    return next(new AppError(400, "can't perform this operation"));

  const user = await User.findById(userId).select(
    'birthDate from currentLivingPlace createdAt workplace education gender email'
  );

  if (dataToAdd === 'education' || dataToAdd === 'workplace')
    user[dataToAdd] = [...user[dataToAdd], data[dataToAdd]];
  else user[dataToAdd] = data[dataToAdd];

  await user.save();

  res.status(200).json(user);
});

export const updateUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const data = req.body;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorizd for this operation'));

  const dataToUpdate = Object.keys(data)[0];

  const availableUpdates = [
    'education',
    'workplace',
    'birthDate',
    'currentLivingPlace',
    'gender',
    'from',
  ];

  if (!availableUpdates.includes(dataToUpdate))
    return next(new AppError(400, "can't perform this operation"));

  const user = await User.findByIdAndUpdate(userId, data, { new: true }).select(
    'birthDate from currentLivingPlace createdAt workplace education gender email'
  );

  res.status(200).json(user);
});

export const deleteUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const data = req.body;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorizd for this operation'));

  const dataToDelete = Object.keys(data)[0];

  const availableDeletions = [
    'education',
    'workplace',
    'birthDate',
    'currentLivingPlace',
    'gender',
    'from',
  ];

  if (!availableDeletions.includes(dataToDelete))
    return next(new AppError(400, "can't perform this operation"));

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $unset: { [dataToDelete]: '' },
    },
    { new: true }
  ).select('birthDate from currentLivingPlace createdAt workplace education gender email');

  res.status(200).json(updatedUser);
});

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
export const getUser = asyncWrapper(async function (req, res, next) {
  const user = await User.findById(currUser.id);
  await user.populate('sentRequests.adressat pendingRequests.adressat friends.friend');

  res.status(200).json();
});

export const getAllUsers = asyncWrapper(async function (req, res, next) {
  const users = await User.find({ userName: { $regex: key } });

  res.status(200).json();
});

export const fnName = asyncWrapper(async function (req, res, next) {});

function checkIfIsFriend(user, userId) {
  const isFriend = user.friends.some((friend) => friend.friend.toString() === userId);
  console.log(userId);
  const info = {
    isFriend,
    isPendingRequest: false,
    isSentRequest: false,
    isForeign: false,
  };

  if (!isFriend) {
    const isPendingRequest = user.pendingRequests.some(
      (request) => request.adressat.toString() === userId
    );
    if (isPendingRequest) info.isPendingRequest = isPendingRequest;
    else if (!isPendingRequest) {
      const isSentRequest = user.sentRequests.some(
        (request) => request.adressat.toString() === userId
      );
      if (isSentRequest) info.isSentRequest = isSentRequest;
      else if (!isSentRequest) info.isForeign = true;
    }
  }

  return info;
}

function checkIfIsFriendOnEach(user, id, doc) {
  const { isFriend } = checkIfIsFriend(user, id);

  if (doc.audience === 'private') return { restricted: true };
  else if (doc.audience === 'friends' && !isFriend) return { restricted: true };
  else return doc;
}
