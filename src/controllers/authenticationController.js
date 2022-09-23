import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';
import User from '../models/User.js';
import asignToken from '../lib/asignToken.js';
import { verifyToken } from '../lib/verifyToken.js';

export const loginUser = asyncWrapper(async function (req, res, next) {
  const { email, password } = req.body;

  const candidateUser = await User.findOne({ email }).select(
    '+password email firstName lastName userName profileImg coverImg createdAt'
  );

  const validPassword = await candidateUser.checkPassword(password, candidateUser.password);

  if (!candidateUser || !validPassword) next(new AppError(404, 'incorect email or password'));

  candidateUser.password = undefined;

  const { token } = asignToken(candidateUser);

  res.status(200).json({ ...candidateUser._doc, token });
});

export const registerUser = asyncWrapper(async function (req, res, next) {
  const { email, password, firstName, lastName } = req.body;
  const newUser = await User.create({ email, password, firstName, lastName });

  const { token } = asignToken(newUser);

  res.status(200).json({ ...newUser._doc, token });
});

export const checkAuth = asyncWrapper(async function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) next(new AppError(403, 'you are not authorized'));

  const token = authHeader.split('Bearer ')[1];

  if (!authHeader || !token) next(new AppError(403, 'you are not authorized'));

  const user = await verifyToken(token);

  if (!user) next(new AppError(403, 'you are not authorized'));

  req.user = user;

  next();
});
