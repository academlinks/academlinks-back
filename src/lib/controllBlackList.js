exports.getBlackList = async function (req, userId) {
  const redis = req.app.get("redis");

  const redisBlacklist = await redis.get(userId);
  const blacklist = redisBlacklist ? JSON.parse(redisBlacklist) : null;

  return blacklist;
};

exports.updateBlackList = async function (req, userId) {
  const existingToken = req.headers.authorization.split("Bearer ")[1];

  const redis = req.app.get("redis");
  await redis.set(userId, JSON.stringify(existingToken), "EX", 3600);
};
