import AppError from '../lib/AppError.js';
import User from '../models/User.js';

export async function controllUserExistence({ req, next }) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId === currUser.id) return next(new AppError(400, 'please provide us valid user id'));

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(userId);

  if (!user || !adressatUser) return next(new AppError(404, 'user does not exists'));

  return { user, adressatUser };
}
