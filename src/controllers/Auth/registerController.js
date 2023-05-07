const crypto = require("crypto");
const mongoose = require("mongoose");
const { EmailUtils } = require("../../utils/email");
const { asyncWrapper, AppError, IO } = require("../../lib");
const { User, Friendship, Registration, Admin } = require("../../models");

exports.registerUser = asyncWrapper(async function (req, res, next) {
  const { email } = req.body;

  const isExistingUserWithEmail = await User.findOne({ email });
  const isExistingUserRegistrationWithEmail = await Registration.findOne({
    email,
  });

  if (isExistingUserWithEmail || isExistingUserRegistrationWithEmail)
    return next(new AppError(405, "user with this email already exists"));

  const user = await Registration.create(req.body);

  //////////////////////////////////////////
  /////////// Send Email To User //////////
  ////////////////////////////////////////
  if (!email)
    return next(new AppError(403, "please provide us valid information"));

  await EmailUtils.sendWelcomeEmail({
    adressat: email,
    userName: user.firstName,
  });

  //////////////////////////////////////////////////
  /////////// Send Notification To Admin //////////
  ////////////////////////////////////////////////

  const admin = await Admin.findOne({ role: "admin" });

  await IO.useSocket(req, {
    data: user,
    adressatId: admin._id,
    operationName: IO.IO_PLACEHOLDERS.new_user_is_registered,
  });

  res.status(200).json({
    msg: "Your registration request will be reviewed and we wil Email you in case of affirmation !",
  });
});

exports.aproveRegistration = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { requestId } = req.params;

  if (currUser.role !== "admin")
    return next(new AppError(405, "you are not authorized for this operation"));

  const registration = await Registration.findById(requestId);

  if (!registration)
    return next(new AppError(404, "registration request does not exists"));

  const resetToken = registration.createPasswordResetToken();

  await EmailUtils.sendAproveRegistrationEmail({
    resetToken,
    adressat: registration.email,
    userName: registration.firstName,
    registrationId: registration._id,
  });

  registration.confirmationEmailSentAt = new Date();

  registration.aproved = true;
  await registration.save({ validateBeforeSave: false });

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
    return next(new AppError(405, "you are not authorized for this operation"));

  const registration = await Registration.findById(requestId);

  if (!registration)
    return next(new AppError(404, "registration request does not exists"));

  const adressat = registration.email;

  await EmailUtils.sendRejectRegistrationEmail({
    adressat,
    userName: registration.firstName,
  });

  await registration.delete();

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
    _id: mongoose.Types.ObjectId(registerId),
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

  const newUserBody = { password };

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

  await Friendship.create({ user: newUser._id });

  await registration.delete();

  res.status(200).json({ success: true });
});

async function createAdmin() {
  const admin = new Admin({
    userName: "",
    password: "",
  });

  await admin.save();
}
