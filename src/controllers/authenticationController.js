const crypto = require("crypto");

const Admin = require("../models/Admin.js");
const User = require("../models/User.js");
const Friendship = require("../models/Friendship.js");
const Registration = require("../models/Registration.js");
const AdminNotification = require("../models/AdminNotification.js");

const AppError = require("../lib/AppError.js");
const asyncWrapper = require("../lib/asyncWrapper.js");
const asignToken = require("../lib/asignToken.js");
const verifyToken = require("../lib/verifyToken.js");
const Email = require("../lib/sendEmail.js");
// const {
//   getBlackList,
//   updateBlackList,
// } = require("../lib/controllBlackList.js");

const { useSocket, socket_name_placeholders } = require("../utils/ioUtils.js");

const { getAppHost } = require("../lib/getOrigins.js");

// SECTION: Registration

exports.registerUser = asyncWrapper(async function (req, res, next) {
  const { email } = req.body;

  const isExistingUserWithEmail = await User.findOne({ email });
  const isExistingUserRegistrationWithEmail = await Registration.findOne({
    email,
  });

  if (isExistingUserWithEmail || isExistingUserRegistrationWithEmail)
    return next(new AppError(403, "user with this email already exists"));

  const newReg = await Registration.create(req.body);

  //////////////////////////////////////////
  /////////// Send Email To User //////////
  ////////////////////////////////////////

  try {
    if (!email)
      return next(new AppError(403, "please provide us valid information"));

    await new Email({
      adressat: email,
    }).sendWelcome();
  } catch (error) {
    return next(
      new AppError(
        500,
        "There was an error sending the email. Try again later!"
      )
    );
  }

  //////////////////////////////////////////////////
  /////////// Send Notification To Admin //////////
  ////////////////////////////////////////////////

  const admin = await Admin.findOne({ role: "admin" });

  await useSocket(req, {
    adressatId: admin._id,
    operationName: socket_name_placeholders.newUserIsRegistered,
    data: newReg,
  });

  res.status(200).json({
    msg: "Your registration request will be reviewed and we wil Email you in case of affirmation !",
  });
});

exports.aproveRegistration = asyncWrapper(async function (req, res, next) {
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

  try {
    await new Email({
      adressat: registration.email,
    }).sendRegistrationAprovment({
      url: `${getAppHost()}/confirmRegistration/${
        registration._id
      }/confirm/${registrationPasswordResetToken}`,
    });
  } catch (error) {
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }

  res.status(200).json({ isAproved: true });
});

exports.deleteRegistrationRequest = asyncWrapper(async function (
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

exports.checkRegistrationExistance = asyncWrapper(async function (
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

exports.confirmRegistration = asyncWrapper(async function (req, res, next) {
  const { registerId, tokenId } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(tokenId).digest("hex");

  const registration = await Registration.findOne({
    _id: registerId,
    passwordResetToken: hashedToken,
  });

  if (!registration)
    return next(new AppError(400, "Token is invalid or has expired"));

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

  const newUser = await new User(newUserBody).save();

  await Friendship.create({
    user: newUser._id,
  });

  await registration.delete();

  res.status(200).json({ success: true });
});

// SECTION: Authorization

exports.loginUser = asyncWrapper(async function (req, res, next) {
  const { email, password } = req.body;

  const candidateUser = await User.findOne({ email }).select(
    "+password email firstName lastName userName profileImg coverImg createdAt role"
  );

  const validPassword = await candidateUser?.checkPassword(
    password,
    candidateUser.password
  );

  if (!candidateUser || !validPassword)
    return next(new AppError(404, "incorect email or password"));

  candidateUser.password = undefined;

  const { accessToken } = await asignToken(res, candidateUser);

  res.status(200).json({ ...candidateUser._doc, accessToken });
});

exports.logoutUser = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;

  // await updateBlackList(req, currUser.id);
  res.cookie("authorization", "");
  res.clearCookie("authorization");
  res.end();
  // res.status(200).json({ loggedOut: true, accessToken: "" });
});

// SECTION: Update User Credentials

exports.changePassword = asyncWrapper(async function (req, res, next) {
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

  // await updateBlackList(req, userId);
  const { accessToken } = await asignToken(res, user);

  res.status(200).json({ accessToken });
});

exports.changeEmail = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { password, email, newEmail } = req.body;

  //////////////////////////////////////////////////
  /////////// Validate And Update User ////////////
  ////////////////////////////////////////////////

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for this operation"));

  const user = await User.findOne({ _id: userId, email }).select("+password");

  const validPassword = await user?.checkPassword(password, user.password);

  if (!user || !validPassword)
    return next(new AppError(403, "incorect email or password"));

  /////////////////////////////////////////////////////////
  /////////// Validate New Email Availability ////////////
  ///////////////////////////////////////////////////////

  const isExistingUserWithEmail = await User.findOne({ email: newEmail });
  const isExistingUserRegistrationWithEmail = await Registration.findOne({
    email: newEmail,
  });

  if (isExistingUserWithEmail || isExistingUserRegistrationWithEmail)
    return next(
      new AppError(403, `user with email - ${newEmail} already exists`)
    );

  user.email = newEmail;
  await user.save({ validateBeforeSave: false });

  //////////////////////////////////////////////////
  /////////// Send Notification To Admin //////////
  ////////////////////////////////////////////////

  const admin = await Admin.findOne({ role: "admin" });

  const adminNotify = await AdminNotification.create({
    from: currUser.id,
    message: "change email",
    options: {
      newEmail: newEmail,
      oldEmail: email,
    },
  });

  await adminNotify.populate({
    path: "from",
    select: "userName profileImg email _id",
  });

  await useSocket(req, {
    adressatId: admin._id,
    operationName: socket_name_placeholders.userChangeEmail,
    data: adminNotify,
  });

  ///////////////////////////////////////////////
  /////////// Asign New Token To User //////////
  /////////////////////////////////////////////

  // await updateBlackList(req, userId);

  const { accessToken } = await asignToken(res, user);

  res.status(201).json({ accessToken, email: user.email });
});

exports.createResetPasswordForForgotPassword = asyncWrapper(async function (
  req,
  res,
  next
) {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    return next(new AppError(404, "user with this email does not exists"));

  const passwordReset = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  try {
    if (!email) return next(new AppError(403, "please provide us valid email"));

    await Registration.create(req.body);

    await new Email({
      adressat: email,
    }).sendPasswordReset(passwordReset);
  } catch (error) {
    return next(
      new AppError(
        500,
        "There was an error sending the email. Try again later!"
      )
    );
  }

  res.status(201).json({
    success: true,
    message: "Your password reset token (valid for only 10 minutes).",
  });
});

exports.updateForgotPassword = asyncWrapper(async function (req, res, next) {
  const { token, password } = req.body;

  const hashedPassword = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPassword: hashedPassword,
    resetPasswordExpiresIn: { $gte: Date.now() },
  });

  if (!user)
    return next(
      new AppError(400, "password reset token is invalid or expird in")
    );

  user.password = password;
  user.resetPassword = undefined;
  user.resetPasswordExpiresIn = undefined;
  await user.save();

  user.password = undefined;

  res.status(200).json({ message: "password is updated", success: true });
});

// SECTION: Authentication

exports.checkAuth = asyncWrapper(async function (req, res, next) {
  const { authorization } = req.headers;
  console.log({ cookieHeader: req.cookies?.authorization });
  const token = authorization?.split(" ");

  if (!authorization || token?.[0] !== "Bearer" || !token?.[1])
    return next(new AppError(401, "you are not authorized"));

  const decodedUser = await verifyToken(token?.[1]);
  if (!decodedUser) return next(new AppError(401, "you are not authorized"));

  // const blacklisted = await getBlackList(req, decodedUser.id);
  // if (blacklisted === token?.[1])
  //   return next(new AppError(401, "you are not authorized - black list"));

  let user;

  if (decodedUser.role === "user") user = await User.findById(decodedUser.id);
  else if (decodedUser.role === "admin")
    user = await Admin.findById(decodedUser.id);

  if (!user) return next(new AppError(404, "user does not exists"));

  req.user = decodedUser;

  next();
});

exports.restriction = (...roles) =>
  asyncWrapper(async function (req, res, next) {
    const currUser = req.user;

    if (!roles.includes(currUser.role))
      return next(new AppError(403, "you are not allowed for this operation"));

    next();
  });

exports.refresh = asyncWrapper(async function (req, res, next) {
  const { authorization } = req.cookies;
  const token = authorization?.split(" ");

  if (!authorization || token[0] !== "Bearer" || !token[1])
    return next(new AppError(401, "you are not authorized"));

  const decodedUser = await verifyToken(token[1], true);
  if (!decodedUser) return next(new AppError(401, "you are not authorized"));

  let user;

  if (decodedUser.role === "user") user = await User.findById(decodedUser.id);
  else if (decodedUser.role === "admin")
    user = await Admin.findById(decodedUser.id);

  if (!user) return next(new AppError(404, "user does not exists"));

  const { accessToken } = await asignToken(res, {
    _id: user._id,
    role: user.role,
    userName: user.userName,
    email: user?.email,
  });

  res.status(200).json({ accessToken });
});
