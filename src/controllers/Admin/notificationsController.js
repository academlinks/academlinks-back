const asyncWrapper = require("../../lib/asyncWrapper.js");
const AppError = require("../../lib/AppError.js");

const {
  Registration,
  Commercials,
  AdminNotification,
} = require("../../models");

exports.getBadges = asyncWrapper(async function (req, res, next) {
  const regCounts = await Registration.find({
    aproved: false,
  }).countDocuments();

  const outdatedCommercialsCount = await Commercials.find({
    validUntil: { $lt: new Date() },
  }).countDocuments();

  const useenNotifies = await AdminNotification.find({
    seen: false,
  }).countDocuments();

  res.status(200).json({
    outdatedCommercialsCount: outdatedCommercialsCount,
    regRequestCount: regCounts,
    unseenNotifications: useenNotifies,
  });
});

exports.getNotifications = asyncWrapper(async function (req, res, next) {
  const notifications = await AdminNotification.find()
    .populate({
      path: "from",
      select: "userName profileImg",
    })
    .sort({ createdAt: -1 });

  res.status(200).json(notifications);
});

exports.getNotification = asyncWrapper(async function (req, res, next) {
  const { notificationId } = req.params;

  const notification = await AdminNotification.findById(
    notificationId
  ).populate({ path: "from", select: "userName profileImg email" });

  if (!notification)
    return next(new AppError(404, "notification does not exists"));

  res.status(200).json(notification);
});

exports.deleteAllNotifications = asyncWrapper(async function (req, res, next) {
  await AdminNotification.deleteMany();

  res.status(204).json({ deleted: true });
});

exports.deleteNotification = asyncWrapper(async function (req, res, next) {
  const { notificationId } = req.params;

  const deletedNotify = await AdminNotification.findByIdAndDelete(
    notificationId
  );

  if (!deletedNotify)
    return next(new AppError(404, "notification does not exists"));

  res.status(204).json({ deleted: true });
});

exports.markNotificationsAsSeen = asyncWrapper(async function (req, res, next) {
  await AdminNotification.updateMany({ seen: false }, { $set: { seen: true } });

  res.status(201).json({ updated: true });
});

exports.markNotificationAsRead = asyncWrapper(async function (req, res, next) {
  const { notificationId } = req.params;

  const updatedNotify = await AdminNotification.findByIdAndUpdate(
    notificationId,
    {
      $set: { read: true },
    }
  );

  if (!updatedNotify)
    return next(new AppError(404, "notification does not exists"));

  res.status(201).json({ marked: true });
});
