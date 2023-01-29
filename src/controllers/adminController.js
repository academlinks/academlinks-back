const asyncWrapper = require("../lib/asyncWrapper.js");
const AppError = require("../lib/AppError.js");
const asignToken = require("../lib/asignToken.js");

const API_Features = require("../lib/API_Features.js");

const Admin = require("../models/Admin.js");
const User = require("../models/User.js");
const Registration = require("../models/Registration.js");
const Commercial = require("../models/Commercials.js");
const AdminNotification = require("../models/AdminNotification.js");

const { uploadMedia, editMedia } = require("../lib/multer.js");
const { getServerHost } = require("../lib/getOrigins.js");
const Email = require("../lib/sendEmail.js");

const fs = require("fs");
const { promisify } = require("util");

////////////////////////////
////////// Media //////////
//////////////////////////

exports.resizeAndOptimiseMedia = editMedia({
  multy: false,
  resize: false,
  destination: "public/images/commercials",
});

exports.uploadCommercialMediaFiles = (imageName) =>
  uploadMedia({
    storage: "memoryStorage",
    destination: "public/images/commercials",
    upload: "single",
    filename: imageName,
  });

////////////////////////////////////
////////// Authorization //////////
//////////////////////////////////

exports.logIn = asyncWrapper(async function (req, res, next) {
  const { userName, password } = req.body;

  const admin = await Admin.findOne({ userName }).select("+password");

  const validPassword = await admin.checkPassword(password, admin.password);

  if (!admin || !validPassword)
    return next(new AppError(404, "incorect username or password"));

  admin.password = undefined;

  const { accessToken } = await asignToken(res, admin);

  res.status(200).json({ accessToken, adminId: admin._id });
});

////////////////////////////
////////// Users //////////
//////////////////////////

exports.getUserLabels = asyncWrapper(async function (req, res, next) {
  const docQuery = new API_Features(User.find(), req.query)
    .pagination()
    .selectFields(
      "profileImg firstName lastName userName email birthDate gender createdAt"
    )
    .filter();

  const { data, docCount } = await docQuery.execute();

  const resBody = {
    users: data,
  };

  if (docCount.isRequested) resBody.docCount = docCount.count;

  res.status(200).json(resBody);
});

exports.getUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;

  const userInfo = await User.findById(userId).select(
    "userName email createdAt education birthDate currentLivingPlace currentWorkplace workplace gender from profileImg"
  );

  if (!userInfo) return next(new AppError(404, "user does not exists"));

  res.status(200).json(userInfo);
});

exports.getUsersForStatistic = asyncWrapper(async function (
  req,
  res,
  next
) {
  const users = await User.find().select(
    "age currentWorkplace.institution currentWorkplace.position gender createdAt currentLivingPlace.country from.country"
  );

  res.status(200).json(users);
});

///////////////////////////////////
////////// Registration //////////
/////////////////////////////////

exports.getRegistrationLabels = asyncWrapper(async function (
  req,
  res,
  next
) {
  const { filter } = req.query;

  const query = {};
  if (filter)
    query.aproved = filter === "aproved" ? true : filter === "new" ? false : "";

  const registrations = await Registration.find(query)
    .select("userName email gender")
    .sort({ createdAt: -1 });

  res.status(200).json(registrations);
});

exports.getRegistration = asyncWrapper(async function (req, res, next) {
  const { registrationId } = req.params;

  const registration = await Registration.findById(registrationId);

  if (!registration)
    return next(new AppError(404, "there are no such a request"));

  res.status(200).json(registration);
});

//////////////////////////////////
////////// Commercials //////////
////////////////////////////////

exports.getCommercials = asyncWrapper(async function (req, res, next) {
  const { all, outdated, active } = req.query;

  const clientQuery = {
    all: all && JSON.parse(all),
    outdated: outdated && JSON.parse(outdated),
    active: active && JSON.parse(active),
  };

  const dbQuery = {};

  if (clientQuery.outdated) dbQuery.validUntil = { $lt: new Date() };
  else if (clientQuery.active) dbQuery.validUntil = { $gte: new Date() };

  const commercials = await Commercial.find(dbQuery);

  res.status(200).json(commercials);
});

exports.getCommercial = asyncWrapper(async function (req, res, next) {
  const { commercialId } = req.params;

  const commercial = await Commercial.findById(commercialId);

  if (!commercial) return next(new AppError(404, "commercial does not exists"));

  res.status(200).json(commercial);
});

exports.addCommercial = asyncWrapper(async function (req, res, next) {
  const commercialBody = req.body;

  const newCommercial = {
    ...commercialBody,
  };

  if (req.file) {
    newCommercial.media = `${getServerHost()}/commercials/${
      req.xOriginal
    }`;
  }

  await Commercial.create(newCommercial);

  res.status(201).json({ created: true });
});

exports.deleteCommercial = asyncWrapper(async function (req, res, next) {
  const { commercialId } = req.params;

  const commercial = await Commercial.findById(commercialId);
  if (!commercial) return next(new AppError(404, "commercial does not exists"));

  const commercialMedia = commercial.media;

  const deletion = promisify(fs.unlink);

  if (commercialMedia) {
    try {
      const originalFileName = commercialMedia.split("/")?.slice(4)[0];
      await deletion(`public/images/commercials/${originalFileName}`);
    } catch (error) {
      return next(
        new AppError(
          403,
          "something went wrong, cant't find and delete removed commercial media files which are attached to the commercial. Please report the problem or try again later"
        )
      );
    }
  }

  await commercial.delete();

  res.status(204).json({ deleted: true });
});

exports.updateCommercial = asyncWrapper(async function (req, res, next) {
  const { commercialId } = req.params;
  const body = req.body;

  const comerc = await Commercial.findById(commercialId);
  if (!comerc) return next(new AppError(404, "commercial does not exists"));

  const media = body.media;

  const deletion = promisify(fs.unlink);

  if (req.file && req.xOriginal) {
    try {
      const originalFileName = media.split("/")?.slice(4)[0];
      await deletion(`public/images/commercials/${originalFileName}`);
      body.media = `${getServerHost()}/commercials/${
        req.xOriginal
      }`;
    } catch (error) {
      return next(
        new AppError(
          403,
          "something went wrong, cant't find and delete removed commercial media files which are attached to the commercial. Please report the problem or try again later"
        )
      );
    }
  }

  Object.keys(body).forEach((key) => (comerc[key] = body[key]));

  await comerc.save();

  res.status(201).json({ updated: true });
});

exports.sendEmailToCommercialCustomer = asyncWrapper(async function (
  req,
  res,
  next
) {
  const { email, subject, text } = req.body;

  if (!email) return next(new AppError(404, "please provide us email"));

  const customer = await Commercial.findOne({ email });

  if (!customer)
    return next(new AppError(404, "customer with this email does not exists"));

  try {
    await new Email({
      adressat: email,
      subject,
      text,
    }).send({});
  } catch (error) {
    return next(
      new AppError(
        500,
        "There was an error sending the email. Try again later!"
      )
    );
  }

  res.status(201).json({ emailIsSent: true });
});

////////////////////////////////////
////////// Notifications //////////
//////////////////////////////////

exports.getBadges = asyncWrapper(async function (req, res, next) {
  const regCounts = await Registration.find({
    aproved: false,
  }).countDocuments();

  const outdatedCommercialsCount = await Commercial.find({
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

exports.deleteAllNotifications = asyncWrapper(async function (
  req,
  res,
  next
) {
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

exports.markNotificationsAsSeen = asyncWrapper(async function (
  req,
  res,
  next
) {
  await AdminNotification.updateMany({ seen: false }, { $set: { seen: true } });

  res.status(201).json({ updated: true });
});

exports.markNotificationAsRead = asyncWrapper(async function (
  req,
  res,
  next
) {
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

///////////////////////////////
async function createAdmin() {
  const admin = new Admin({
    userName: "admin_mark",
    password: "sh12mk3tt_7xxAdmin",
  });

  await admin.save();
}
