const asyncWrapper = require("../../lib/asyncWrapper.js");
const AppError = require("../../lib/AppError.js");

const API_Features = require("../../lib/API_Features.js");

const { User } = require("../../models");

exports.getUserLabels = asyncWrapper(async function (req, res, next) {
  const docQuery = new API_Features(User.find(), req.query)
    .pagination()
    .selectFields(
      "profileImg firstName lastName userName email birthDate gender createdAt"
    )
    .filter();

  const { data, docCount } = await docQuery.execute();

  const resBody = {
    users: data,
  };

  if (docCount.isRequested) resBody.docCount = docCount.count;

  res.status(200).json(resBody);
});

exports.getUserInfo = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;

  const userInfo = await User.findById(userId).select(
    "userName email createdAt education birthDate currentLivingPlace currentWorkplace workplace gender from profileImg"
  );

  if (!userInfo) return next(new AppError(404, "user does not exists"));

  res.status(200).json(userInfo);
});

exports.getUsersForStatistic = asyncWrapper(async function (req, res, next) {
  const users = await User.find().select(
    "age currentWorkplace.institution currentWorkplace.position gender createdAt currentLivingPlace.country from.country"
  );

  res.status(200).json(users);
});
