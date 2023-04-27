const asyncWrapper = require("../../lib/asyncWrapper.js");
const AppError = require("../../lib/AppError.js");
const asignToken = require("../../lib/asignToken.js");
const verifyToken = require("../../lib/verifyToken.js");

const { User, Admin } = require("../../models");

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
  res.cookie("authorization", "");
  res.end();
});

exports.refresh = asyncWrapper(async function (req, res, next) {
  const { authorization } = req.cookies;
  const token = authorization?.split(" ");

  if (!authorization || token[0] !== "Bearer" || !token[1])
    return next(new AppError(401, "you are not authorized"));

  const decodedUser = await verifyToken(token[1], true);

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

exports.adminLogIn = asyncWrapper(async function (req, res, next) {
  const { userName, password } = req.body;

  const admin = await Admin.findOne({ userName }).select("+password");

  const validPassword = await admin.checkPassword(password, admin.password);

  if (!admin || !validPassword)
    return next(new AppError(404, "incorect username or password"));

  admin.password = undefined;

  const { accessToken } = await asignToken(res, admin);

  res.status(200).json({ accessToken, adminId: admin._id });
});
