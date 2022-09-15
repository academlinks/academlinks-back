import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';
import User from '../models/User.js';
import asignToken from '../lib/asignToken.js';
import { verifyToken } from '../lib/verifyToken.js';

export const loginUser = asyncWrapper(async function (req, res, next) {
  const { email, password } = req.body;

  const candidateUser = await User.findOne({ email }).select('+password');

  const validPassword = await candidateUser.checkPassword(password, candidateUser.password);

  if (!candidateUser || !validPassword) next(new AppError(404, 'incorect email or password'));

  candidateUser.password = undefined;

  const { token } = asignToken(candidateUser);

  res.status(200).json({ ...candidateUser._doc, token });
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

// async registerUser(_, { registerInput: { email, password, firstName, lastName } }, context) {
//   try {
//     const newUser = await User.create({ email, password, firstName, lastName });

//     const { token } = asignToken(newUser);

//     return { ...newUser._doc, token };
//   } catch (error) {
//     throw new UserInputError(error.message);
//   }
// },

// async loginUser(_, { loginInput: { email, password } }, context) {
//   try {

//   } catch (error) {}
// },
