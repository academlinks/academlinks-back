import mongoose from 'mongoose';

import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import Notification from '../models/Notification.js';

export const getAllNotifications = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;
  const { ObjectId } = mongoose.Types;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorized for this operation'));

  const notifies = await Notification.find({ adressat: ObjectId(userId) }).populate({
    path: 'from adressat',
    select: 'userName profileImg',
  });

  res.status(200).json(notifies);
});

export const markAsRead = asyncWrapper(async function (req, res, next) {
  const { notifyId } = req.params;
  const currUser = req.user;

  const notify = await Notification.findByIdAndUpdate(
    notifyId,
    { read: true },
    { new: true }
  ).populate({
    path: 'from adressat',
    select: 'userName profileImg',
  });

  if (currUser.id !== notify.adressat._id.toString())
    return next(new AppError(403, 'you are not authorised for this operation'));

  if (!notify) return next(new AppError(404, 'notification does not exists'));

  res.status(200).json(notify);
});

export const deleteAllUserNotification = asyncWrapper(async function (req, res, next) {});

export const deleteUserNotification = asyncWrapper(async function (req, res, next) {
  const { notifyId } = req.params;
  const currUser = req.user;

  const notify = await Notification.findById(notifyId);

  if (!notify) return next(new AppError(404, 'notification does not exists'));
  else if (notify.adressat.toString() !== currUser.id)
    return next(new AppError(404, 'you are not authorised for this operation'));

  await notify.delete();

  res.status(204).json({ deleted: true });
});
