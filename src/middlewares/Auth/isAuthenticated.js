const asyncWrapper = require("../../lib/asyncWrapper");

const isAuthenticated = asyncWrapper(async function (req, res, next) {
  const { authorization } = req.headers;
  const token = authorization?.split(" ");

  if (!authorization || token?.[0] !== "Bearer" || !token?.[1])
    req.isAuthenticated = false;
  else req.isAuthenticated = true;

  next();
});

module.exports = isAuthenticated;
