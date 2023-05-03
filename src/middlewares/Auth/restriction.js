const { AppError, asyncWrapper } = require("../../lib");

const restriction = (...roles) =>
  asyncWrapper(async function (req, res, next) {
    const currUser = req.user;

    if (!roles.includes(currUser.role))
      return next(new AppError(403, "you are not allowed for this operation"));

    next();
  });

module.exports = restriction;
