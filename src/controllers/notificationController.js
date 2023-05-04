const mongoose = require("mongoose");
const { Notification } = require("../models");
const { AppError, asyncWrapper } = require("../lib");

exports.getAllNotifications = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorized for this operation"));

  const notifies = await Notification.find({
    adressat: mongoose.Types.ObjectId(userId),
  })
    .populate({
      path: "from adressat",
      select: "userName profileImg",
    })
    .sort("-createdAt");

  res.status(200).json(notifies);
});

exports.markAsRead = asyncWrapper(async function (req, res, next) {
  const { notifyId } = req.params;
  const currUser = req.user;

  const notify = await Notification.findByIdAndUpdate(
    notifyId,
    { read: true },
    { new: true }
  ).populate({
    path: "from adressat",
    select: "userName profileImg",
  });

  if (currUser.id !== notify.adressat._id.toString())
    return next(new AppError(403, "you are not authorised for this operation"));

  if (!notify) return next(new AppError(404, "notification does not exists"));

  res.status(200).json(notify);
});

exports.markAllUserNotificationAsRead = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;

  await Notification.updateMany(
    { adressat: currUser.id, read: false },
    { $set: { read: true } }
  );

  res.status(201).json({ updated: true });
});

exports.deleteAllUserNotification = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;

  await Notification.deleteMany({ adressat: currUser.id });

  res.status(204).json({ deleted: true });
});

exports.deleteUserNotification = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { notifyId } = req.params;

  const notify = await Notification.findById(notifyId);

  if (!notify) return next(new AppError(404, "notification does not exists"));
  else if (notify.adressat.toString() !== currUser.id)
    return next(new AppError(404, "you are not authorised for this operation"));

  await notify.delete();

  res.status(204).json({ deleted: true });
});

exports.getUnseenNotificationsCount = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;
  const { userId } = req.params;

  if (currUser.id !== userId)
    return next(new AppError(403, "you are not authorized for this operation"));

  const unreadNotifications = await Notification.find({
    adressat: currUser.id,
    seen: false,
  }).select("_id read");

  res.status(200).json(unreadNotifications);
});

exports.markNotificationAsSeen = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;

  if (currUser.id !== userId)
    return next(new AppError(403, "you are not authorized for this operation"));

  await Notification.updateMany(
    { adressat: currUser.id, seen: false },
    { seen: true }
  );

  res.status(200).json({ isMarked: true });
});
