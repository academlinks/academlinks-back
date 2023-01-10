import { asyncWrapper } from "../lib/asyncWrapper.js";
import AppError from "../lib/AppError.js";
import asignToken from "../lib/asignToken.js";

import API_Features from "../lib/API_Features.js";

import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Registration from "../models/Registration.js";
import Commercial from "../models/Commercials.js";

import { uploadMedia, editMedia } from "../lib/multer.js";
import { getServerHost } from "../lib/getOrigins.js";

import fs from "fs";
import { promisify } from "util";

///////////////////////////////////////
///////////////////////////////////////
///////////////////////////////////////

export const resizeAndOptimiseMedia = editMedia({
  multy: false,
  resize: false,
  destination: "public/images/commercials",
});

export const uploadCommercialMediaFiles = (imageName) =>
  uploadMedia({
    storage: "memoryStorage",
    destination: "public/images/commercials",
    upload: "single",
    filename: imageName,
  });

export const logIn = asyncWrapper(async function (req, res, next) {
  const { userName, password } = req.body;

  const admin = await Admin.findOne({ userName }).select("+password");

  const validPassword = await admin.checkPassword(password, admin.password);

  if (!admin || !validPassword)
    return next(new AppError(404, "incorect username or password"));

  admin.password = undefined;

  const { accessToken } = await asignToken(res, admin);

  res.status(200).json({ accessToken });
});

export const getUserLabels = asyncWrapper(async function (req, res, next) {
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

export const getUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;

  const userInfo = await User.findById(userId).select(
    "userName email createdAt education birthDate currentLivingPlace currentWorkplace workplace gender from profileImg"
  );

  if (!userInfo) return next(new AppError(404, "user does not exists"));

  res.status(200).json(userInfo);
});

export const getUsersForStatistic = asyncWrapper(async function (
  req,
  res,
  next
) {
  const users = await User.find().select(
    "age currentWorkplace.position gender createdAt currentLivingPlace.country from.country"
  );

  res.status(200).json(users);
});

export const getRegistrationLabels = asyncWrapper(async function (
  req,
  res,
  next
) {
  const { filter } = req.query;

  const query = {};
  if (filter)
    query.aproved = filter === "aproved" ? true : filter === "new" ? false : "";

  const registrations = await Registration.find(query).select(
    "userName email gender"
  );

  res.status(200).json(registrations);
});

export const getRegistration = asyncWrapper(async function (req, res, next) {
  const { registrationId } = req.params;

  const registration = await Registration.findById(registrationId);

  if (!registration)
    return next(new AppError(404, "there are no such a request"));

  res.status(200).json(registration);
});

export const getCommercials = asyncWrapper(async function (req, res, next) {
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

export const getCommercial = asyncWrapper(async function (req, res, next) {
  const { commercialId } = req.params;

  const commercial = await Commercial.findById(commercialId);

  if (!commercial) return next(new AppError(404, "commercial does not exists"));

  res.status(200).json(commercial);
});

export const addCommercial = asyncWrapper(async function (req, res, next) {
  const commercialBody = req.body;

  const newCommercial = {
    ...commercialBody,
  };

  if (req.file) {
    newCommercial.media = `${req.protocol}://${getServerHost()}/commercials/${
      req.xOriginal
    }`;
  }

  await Commercial.create(newCommercial);

  res.status(201).json({ created: true });
});

export const deleteCommercial = asyncWrapper(async function (req, res, next) {
  const { commercialId } = req.params;

  const commercial = await Commercial.findById(commercialId);
  if (!commercial) return next(new AppError(404, "commercial does not exists"));

  const commercialMedia = commercial.media;

  const deletion = promisify(fs.unlink);

  if (commercialMedia) {
    try {
      const originalFileName = commercialMedia.split("/")?.slice(4)[0];
      console.log(originalFileName);
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

export const updateCommercial = asyncWrapper(async function (req, res, next) {
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
      body.media = `${req.protocol}://${getServerHost()}/commercials/${
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

async function createAdmin() {
  const admin = new Admin({
    userName: "admin_mark",
    password: "sh12mk3tt_7xxAdmin",
  });

  await admin.save();
}
