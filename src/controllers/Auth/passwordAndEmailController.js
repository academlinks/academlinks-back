const {
  User,
  Registration,
  Admin,
  AdminNotification,
} = require("../../models");
const crypto = require("crypto");
const { IO } = require("../../utils/io");
const { asyncWrapper, AppError, JWT, Email } = require("../../lib");
const io = new IO();

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

  await io.useSocket(req, {
    data: adminNotify,
    adressatId: admin._id,
    operationName: io.IO_PLACEHOLDERS.userChangeEmail,
  });

  ///////////////////////////////////////////////
  /////////// Asign New Token To User //////////
  /////////////////////////////////////////////

  // await updateBlackList(req, userId);

  const { accessToken } = await JWT.asignToken({ res, user });

  res.status(201).json({ accessToken, email: user.email });
});

exports.changePassword = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;
  const { password, newPassword } = req.body;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for tis operation"));

  const user = await User.findById(userId).select("+password");

  const validPassword = await user.checkPassword(password, user.password);

  if (!user || !validPassword)
    return next(new AppError(400, "incorect password"));

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  // await updateBlackList(req, userId);
  const { accessToken } = await JWT.asignToken({ res, user });

  res.status(200).json({ accessToken });
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
    if (!email) return next(new AppError(400, "please provide us valid email"));

    await new Email({
      adressat: email,
    }).sendPasswordReset({
      resetToken: passwordReset,
      userName: user.userName,
    });
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
      new AppError(400, "password reset token is invalid or expired in")
    );

  user.password = password;
  user.resetPassword = undefined;
  user.resetPasswordExpiresIn = undefined;
  await user.save({ validateBeforeSave: false });

  user.password = undefined;

  res.status(200).json({ message: "password is updated", success: true });
});
