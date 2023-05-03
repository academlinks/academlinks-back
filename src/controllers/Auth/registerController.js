const {
  CLIENT_TERMS_URL,
  GENERATE_CONFIRM_REGISTRATION_PASSWORD_RESET_LINK,
} = require("../../config");
const { asyncWrapper, AppError, Email } = require("../../lib");

const { User, Friendship, Registration, Admin } = require("../../models");

const crypto = require("crypto");

const { IO } = require("../../utils/io");
const io = new IO();

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

  try {
    if (!email)
      return next(new AppError(403, "please provide us valid information"));

    await new Email({
      adressat: email,
    }).sendWelcome({ userName: user.firstName });
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

  await io.useSocket(req, {
    data: user,
    adressatId: admin._id,
    operationName: io.IO_PLACEHOLDERS.newUserIsRegistered,
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

  const registrationPasswordResetToken =
    registration.createPasswordResetToken();

  try {
    await new Email({
      adressat: registration.email,
    }).sendRegistrationAprovment({
      userName: registration.firstName,
      url: GENERATE_CONFIRM_REGISTRATION_PASSWORD_RESET_LINK({
        registrationId: registration._id,
        resetToken: registrationPasswordResetToken,
      }),
    });

    registration.confirmationEmailSentAt = new Date();
  } catch (error) {
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }

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

  try {
    await new Email({
      adressat,
    }).sendRegistrationReject({
      userName: registration.firstName,
      termsUrl: CLIENT_TERMS_URL,
    });
  } catch (error) {
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }

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

async function createAdmin() {
  const admin = new Admin({
    userName: "",
    password: "",
  });

  await admin.save();
}
