import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import Post from '../models/Post.js';
import User from '../models/User.js';

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
  const { userId } = req.params;

  const posts = await Post.find({ author: userId })
    .populate({
      path: 'author authenticAuthor reactions.author',
      select: 'userName profileImg',
    })
    .sort('-createdAt');

  res.status(200).json(posts);
});

export const getUserFeed = asyncWrapper(async function (req, reqs, next) {
  const { userId } = req.params;

  const feed = await User.aggregate([
    {
      $match: { _id: mongoose.Types.ObjectId(userId) },
    },
    {
      $project: {
        _id: 1,
        friends: 1,
      },
    },
    {
      $unwind: '$friends',
    },
    {
      $lookup: {
        from: 'posts',
        localField: 'friends.friend',
        foreignField: 'author',
        as: 'friendsPosts',
        // pipeline: [
        //   {
        //     $skip: 1,
        //   },
        // ],
      },
    },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
        as: 'userPosts',
        // pipeline: [
        //   {
        //     $skip: 1,
        //   },
        // ],
      },
    },
    {
      $project: {
        feed: { $concatArrays: ['$friendsPosts', '$userPosts'] },
      },
    },
    {
      $unwind: '$feed',
    },
    {
      $sort: { 'feed.createdAt': -1 },
    },
    {
      $group: {
        _id: null,
        feedPosts: { $push: '$feed' },
      },
    },
  ]);

  const feedPosts = await Post.populate(feed[0].feedPosts, {
    path: 'author authenticAuthor',
    select: 'userName profileImg',
  });

  reqs.status(200).json(feedPosts);
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

export const getBookmarks = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorizd for this operation'));

  const savedPosts = await User.findById(userId)
    .select('bookmarks')
    .populate({
      path: 'bookmarks',
      populate: { path: 'author authenticAuthor', select: 'userName profileImg' },
    });

  res.status(200).json(savedPosts.bookmarks);
});

export const isFriend = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  const user = await User.findById(currUser.id);

  const isFriend = user.friends.some((friend) => friend.friend.toString() === userId);

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

  res.status(200).json(info);
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

export const getUserInfo = asyncWrapper(async function (req, res, next) {
  const user = await User.findById(userId).select(
    'birthDate from currentLivingPlace workplace education gender email'
  );

  res.status(200).json();
});

export const updateUserInfo = asyncWrapper(async function (req, res, next) {
  const user = await User.findById(currUser.id).select(
    'birthDate from currentLivingPlace workplace education gender'
  );

  if (!user) throw new Error('user does not exists');

  const nestedFields = ['workplace', 'education'];
  const fieldToUpdate = Object.keys(updateUserInfoInput)[0];

  if (nestedFields.includes(fieldToUpdate)) {
    user[fieldToUpdate].push(updateUserInfoInput[fieldToUpdate]);
    await user.save();
  } else {
    user[fieldToUpdate] = updateUserInfoInput[fieldToUpdate];
    await user.save();
  }

  res.status(200).json();
});

export const deleteUserInfo = asyncWrapper(async function (req, res, next) {
  const updatedUser = await User.findByIdAndUpdate(
    currUser.id,
    {
      $unset: { [fieldName]: '' },
    },
    { new: true }
  );

  if (!updatedUser) throw new Error('user does not exist');

  res.status(200).json();
});

export const sendFriendRequest = asyncWrapper(async function (req, res, next) {
  if (adressat === currUser.id) throw new Error("you can't send friend request to yourself");

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(adressat);

  if (!adressatUser) throw new Error('user does not exists');

  adressatUser.pendingRequests.push({ adressat: currUser.id });
  user.sentRequests.push({ adressat: adressatUser._id });

  await user.save();
  await adressatUser.save();

  await user.populate({ path: 'sentRequests.adressat' });

  res.status(200).json();
});

export const cancelFriendRequest = asyncWrapper(async function (req, res, next) {
  if (adressat === currUser.id) throw new Error('please provide us valid user id');

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(adressat);

  adressatUser.pendingRequests = adressatUser.pendingRequests.filter(
    (request) => request.adressat.toString() !== currUser.id
  );

  user.sentRequests = user.sentRequests.filter(
    (request) => request.adressat.toString() !== adressatUser._id.toString()
  );

  await user.save();
  await adressatUser.save();

  await user.populate({ path: 'sentRequests.adressat' });

  res.status(200).json();
});

export const deleteFriendRequest = asyncWrapper(async function (req, res, next) {
  res.status(200).json();

  if (adressat === currUser.id) throw new Error('please provide us valid user id');

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(adressat);

  adressatUser.sentRequests = adressatUser.sentRequests.filter(
    (request) => request.adressat.toString() !== currUser.id
  );

  user.pendingRequests = user.pendingRequests.filter(
    (request) => request.adressat.toString() !== adressatUser._id.toString()
  );

  await user.save();
  await adressatUser.save();

  await user.populate({ path: 'pendingRequests.adressat' });

  res.status(200).json();
});

export const confirmFriendRequest = asyncWrapper(async function (req, res, next) {
  res.status(200).json();

  if (adressat === currUser.id) throw new Error('please provide us valid user id');

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(adressat);

  if (!adressatUser) throw new Error('user does not exists');

  adressatUser.sentRequests = adressatUser.sentRequests.filter(
    (request) => request.adressat.toString() !== currUser.id
  );

  user.pendingRequests = user.pendingRequests.filter(
    (request) => request.adressat.toString() !== adressatUser._id.toString()
  );

  user.friends.push({ friend: adressatUser._id });
  adressatUser.friends.push({ friend: currUser.id });

  await user.save();
  await adressatUser.save();

  await user.populate({ path: 'pendingRequests.adressat' });

  res.status(200).json();
});

export const deleteFriend = asyncWrapper(async function (req, res, next) {
  if (adressat === currUser.id) throw new Error('please provide us valid user id');

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(adressat);

  if (!adressatUser) throw new Error('user does not exists');

  adressatUser.friends = adressatUser.friends.filter((fr) => fr.friend.toString() !== currUser.id);

  user.friends = user.friends.filter((fr) => fr.friend.toString() !== adressatUser._id.toString());

  await user.save();
  await adressatUser.save();

  await user.populate({ path: 'friends.friend' });

  res.status(200).json();
});

export const fnName = asyncWrapper(async function (req, res, next) {});
