import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import User from '../models/User.js';
import Refresher from '../models/Refreshers.js';

import asignToken from '../lib/asignToken.js';
import { verifyToken } from '../lib/verifyToken.js';

export const loginUser = asyncWrapper(async function (req, res, next) {
  const { email, password } = req.body;

  const candidateUser = await User.findOne({ email }).select(
    '+password email firstName lastName userName profileImg coverImg createdAt role'
  );

  const validPassword = await candidateUser.checkPassword(password, candidateUser.password);

  if (!candidateUser || !validPassword) next(new AppError(404, 'incorect email or password'));

  candidateUser.password = undefined;

  const { refreshToken } = await asignToken(res, candidateUser);

  res.status(200).json({ ...candidateUser._doc, refreshToken });
});

export const registerUser = asyncWrapper(async function (req, res, next) {
  const { email, password, firstName, lastName } = req.body;
  const newUser = await User.create({ email, password, firstName, lastName });

  const { token } = asignToken(newUser);

  res.status(200).json({ ...newUser._doc, token });
});

export const checkAuth = asyncWrapper(async function (req, res, next) {
  const { Authorization } = req.cookies;

  const token = Authorization.split(' ');

  if (!Authorization || token[0] !== 'Bearer' || !token[1])
    next(new AppError(401, 'you are not authorized'));

  const decodedUser = await verifyToken(token[1]);
  if (!decodedUser) next(new AppError(401, 'you are not authorized'));

  const user = await User.findById(decodedUser.id);
  if (!user) next(new AppError(404, 'user does not exists'));

  req.user = decodedUser;

  next();
});

export const restriction = (...roles) =>
  asyncWrapper(async function (req, res, next) {
    const currUser = req.user;

    if (!roles.includes(currUser.role))
      return next(new AppError(403, 'you are not allowed for this operation'));

    next();
  });

export const refresh = asyncWrapper(async function (req, res, next) {
  const { authorization } = req.headers;

  const token = authorization.split(' ');

  if (!authorization || token[0] !== 'Bearer' || !token[1])
    next(new AppError(401, 'you are not authorized'));

  const decodedUser = await verifyToken(token[1], true);
  if (!decodedUser) next(new AppError(401, 'you are not authorized'));

  const user = await User.findById(decodedUser.id);
  if (!user) next(new AppError(404, 'user does not exists'));

  const freshToken = await Refresher.find({ refresher: token[1] });
  if (!freshToken[0]) return next(new AppError('invalid token'));

  await Refresher.findOneAndDelete({ refresher: token[1] });

  const { refreshToken } = await asignToken(res, {
    _id: user._id,
    role: user.role,
    userName: user.userName,
    email: user.email,
  });

  res.status(201).json({ refreshToken });
});
