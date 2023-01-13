import AppError from "../lib/AppError.js";
import { asyncWrapper } from "../lib/asyncWrapper.js";

import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Friendship from "../models/Friendship.js";
import Registration from "../models/Registration.js";
import AdminNotification from "../models/AdminNotification.js";

import asignToken from "../lib/asignToken.js";
import { verifyToken } from "../lib/verifyToken.js";
import { Email } from "../lib/sendEmail.js";
import crypto from "crypto";

import { useLazySocket, socket_name_placeholders } from "../utils/ioUtils.js";

import { getAppHost } from "../lib/getOrigins.js";

export const registerUser = asyncWrapper(async function (req, res, next) {
  const { email } = req.body;

  // try {
  //   if (!email)
  //     return next(new AppError(403, "please provide us valid information"));

  //   await Registration.create(req.body);

  //   await new Email({
  //     adressat: email,
  //   }).sendWelcome();
  // } catch (error) {
  //   return next(
  //     new AppError(
  //       500,
  //       "There was an error sending the email. Try again later!"
  //     )
  //   );
  // }

  const isExistingEmail = await User.findOne({ email });

  if (isExistingEmail)
    return next(new AppError(403, "user with this email already exists"));

  const newReg = await Registration.create(req.body);

  res.status(200).json({
    msg: "Your registration request will be reviewed and we wil Email you in case of affirmation !",
    id: newReg._id,
  });
});

export const aproveRegistration = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { requestId } = req.params;

  if (currUser.role !== "admin")
    return next(new AppError(403, "you are not authorized for this operation"));

  const registration = await Registration.findById(requestId);

  if (!registration)
    return next(new AppError(404, "registration request does not exists"));

  const registrationPasswordResetToken =
    registration.createPasswordResetToken();

  registration.aproved = true;
  await registration.save({ validateBeforeSave: false });

  // try {
  //   await new Email({
  //     adressat: registration.email,
  //   }).sendRegistrationAprovment({
  //     url: `${getAppHost()}/confirmRegistration/${registration._id}/confirm/${registrationPasswordResetToken}`,
  //   });
  // } catch (error) {
  //   return next(
  //     new AppError("There was an error sending the email. Try again later!"),
  //     500
  //   );
  // }

  res
    .status(200)
    .json({ isAproved: true, resetToken: registrationPasswordResetToken });
});

export const deleteRegistrationRequest = asyncWrapper(async function (
  req,
  res,
  next
) {
  const { requestId } = req.params;
  const currUser = req.user;

  if (currUser.role !== "admin")
    return next(new AppError(403, "you are not authorized for this operation"));

  const registration = await Registration.findById(requestId);

  if (!registration)
    return next(new AppError(404, "registration request does not exists"));

  const adressat = registration.email;
  await registration.delete();

  try {
    await new Email({
      adressat,
    }).sendRegistrationReject();
  } catch (error) {
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }

  res.status(204).json({ deleted: true });
});

export const checkRegistrationExistance = asyncWrapper(async function (
  req,
  res,
  next
) {
  const { registerId, tokenId } = req.params;

  const hashedToken = crypto.createHash("sha256").update(tokenId).digest("hex");

  const register = await Registration.findOne({
    _id: registerId,
    passwordResetToken: hashedToken,
  });

  if (!register)
    return next(new AppError(404, "registration request does not exists"));

  res.status(200).json({ isExistingRequest: true });
});

export const confirmRegistration = asyncWrapper(async function (
  req,
  res,
  next
) {
  const { registerId, tokenId } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(tokenId).digest("hex");

  const registration = await Registration.findOne({
    _id: registerId,
    passwordResetToken: hashedToken,
  });

  if (!registration)
    return next(new AppError("Token is invalid or has expired", 400));

  const newUserBody = {
    password,
  };

  Object.keys(registration._doc)
    .filter(
      (key) => !["_id", "aproved", "passwordResetToken", "__v"].includes(key)
    )
    .map((key) => {
      if (key === "registrationBio")
        newUserBody.currentWorkplace = {
          institution: registration.registrationBio.institution,
          position: registration.registrationBio.position,
          description: registration.registrationBio.description,
        };
      else newUserBody[key] = registration._doc[key];
    });

  const newUser = await User.create(newUserBody);

  await Friendship.create({
    user: newUser._id,
  });

  await registration.delete();

  res.status(200).json({ success: true });
});

export const loginUser = asyncWrapper(async function (req, res, next) {
  const { email, password } = req.body;

  const candidateUser = await User.findOne({ email }).select(
    "+password email firstName lastName userName profileImg coverImg createdAt role"
  );

  const validPassword = await candidateUser.checkPassword(
    password,
    candidateUser.password
  );

  if (!candidateUser || !validPassword)
    return next(new AppError(404, "incorect email or password"));

  candidateUser.password = undefined;

  const { accessToken } = await asignToken(res, candidateUser);

  res.status(200).json({ ...candidateUser._doc, accessToken });
});

export const logoutUser = asyncWrapper(async function (req, res, next) {
  res.clearCookie("authorization");
  res.status(200).json({ loggedOut: true, accessToken: "" });
});

export const changePassword = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { password, newPassword } = req.body;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for tis operation"));

  const user = await User.findById(userId).select("+password");

  const validPassword = await user.checkPassword(password, user.password);

  if (!user || !validPassword)
    return next(new AppError(403, "incorect password"));

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  const { accessToken } = await asignToken(res, user);

  res.status(200).json({ accessToken });
});

export const changeEmail = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { password, email, newEmail } = req.body;

  //////////////////////////////////////////////////
  /////////// Validate And Update User ////////////
  ////////////////////////////////////////////////

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for tis operation"));

  const user = await User.findOne({ _id: userId, email }).select("+password");

  const validPassword = await user.checkPassword(password, user.password);

  if (!user || !validPassword)
    return next(new AppError(403, "incorect email or password"));

  user.email = newEmail;
  await user.save({ validateBeforeSave: false });

  //////////////////////////////////////////////////
  /////////// Send Notification To Admin //////////
  ////////////////////////////////////////////////

  const admin = await Admin.findOne({ role: "admin" });

  const adminNotify = await AdminNotification.create({
    from: currUser.id,
    message: "user change email",
    options: {
      newEmail: newEmail,
      oldEmail: email,
    },
  });

  const sender = await useLazySocket(req);

  await sender({
    adressatId: admin._id,
    operationName: socket_name_placeholders.adminChangeEmail,
    data: adminNotify,
  });

  ///////////////////////////////////////////////
  /////////// Asign New Token To User //////////
  /////////////////////////////////////////////

  const { accessToken } = await asignToken(res, user);

  res.status(200).json({ accessToken, email: user.email });
});

export const checkAuth = asyncWrapper(async function (req, res, next) {
  const { authorization } = req.headers;

  const token = authorization?.split(" ");
  if (!authorization || token?.[0] !== "Bearer" || !token?.[1])
    return next(new AppError(401, "you are not authorized"));

  const decodedUser = await verifyToken(token?.[1]);
  if (!decodedUser) return next(new AppError(401, "you are not authorized"));

  const user = await User.findById(decodedUser.id);

  if (decodedUser.role === "user" && !user)
    return next(new AppError(404, "user does not exists"));

  req.user = decodedUser;

  next();
});

export const restriction = (...roles) =>
  asyncWrapper(async function (req, res, next) {
    const currUser = req.user;

    if (!roles.includes(currUser.role))
      return next(new AppError(403, "you are not allowed for this operation"));

    next();
  });

export const refresh = asyncWrapper(async function (req, res, next) {
  const { authorization } = req.cookies;
  const token = authorization?.split(" ");

  if (!authorization || token[0] !== "Bearer" || !token[1])
    return next(new AppError(401, "you are not authorized"));

  const decodedUser = await verifyToken(token[1], true);
  if (!decodedUser) return next(new AppError(401, "you are not authorized"));

  let user;
  if (decodedUser.role === "user") user = await User.findById(decodedUser.id);

  if (decodedUser.role === "user" && !user)
    return next(new AppError(404, "user does not exists"));

  let admin;
  if (decodedUser.role === "admin")
    admin = await Admin.findById(decodedUser.id);

  if (decodedUser.role === "admin" && !admin)
    return next(new AppError(404, "user does not exists"));

  const { accessToken } = await asignToken(
    res,
    decodedUser.role === "user"
      ? {
          _id: user._id,
          role: user.role,
          userName: user.userName,
          email: user.email,
        }
      : admin
  );

  res.status(200).json({ accessToken });
});
