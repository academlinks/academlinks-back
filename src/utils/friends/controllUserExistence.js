const { AppError } = require("../../lib");
const { User } = require("../../models");

async function controllUserExistence({ req, next }) {
  const currUser = req.user;
  const { userId } = req.params;

  if (userId === currUser.id)
    return next(new AppError(400, "please provide us valid user id"));

  const user = await User.findById(currUser.id);
  const adressatUser = await User.findById(userId);

  if (!user || !adressatUser)
    return next(new AppError(404, "user does not exists"));

  return { user, adressatUser };
}

module.exports = controllUserExistence;
