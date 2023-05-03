const { User, Admin } = require("../../models");
const { asyncWrapper, AppError, JWT } = require("../../lib");

const checkAuth = asyncWrapper(async function (req, res, next) {
  const { authorization } = req.headers;
  const token = authorization?.split(" ");

  if (!authorization || token?.[0] !== "Bearer" || !token?.[1])
    return next(new AppError(401, "you are not authorized"));

  const decodedUser = await JWT.verifyToken({ token: token?.[1] });
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

module.exports = checkAuth;
