const mongoose = require("mongoose");
const { Post } = require("../../models");
const { AppError, asyncWrapper } = require("../../lib");

exports.getBlogPost = asyncWrapper(async function (req, res, next) {
  const isAuthenticated = req.isAuthenticated;
  const { postId } = req.params;

  const post = await Post.findOne({ _id: postId, type: "blogPost" })
    .select("-reactions -__v")
    .populate({
      path: "author tags.user",
      select: "userName profileImg",
    });

  if (!post) return next(new AppError(404, "post does not exists"));
  else if (post && post.audience === "users" && !isAuthenticated)
    return next(
      new AppError(403, "post does not exists or its audience is restricted")
    );

  res.status(200).json(post);
});

exports.getBlogPosts = asyncWrapper(async function (req, res, next) {
  const { page, limit, hasMore, author, category } = req.query;

  const skip = page * limit - limit;

  const postQuery = {
    type: "blogPost",
  };

  if (category) postQuery.category = { $in: category.split(",") };
  if (author) postQuery.author = author;

  let postsLength;
  if (hasMore && !JSON.parse(hasMore))
    postsLength = await Post.find(postQuery).countDocuments();

  const blogPosts = await Post.find(postQuery)
    .select("-reactions -__v")
    .skip(skip)
    .limit(limit)
    .sort("-createdAt")
    .populate({
      path: "author tags.user reactions.author",
      select: "userName profileImg",
    });

  res.status(200).json({ data: blogPosts, results: postsLength });
});

exports.getTopRatedBlogPosts = asyncWrapper(async function (req, res, next) {
  const { limit } = req.query;
  const monthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1));

  const posts = await Post.find({
    type: "blogPost",
    createdAt: { $gte: monthAgo },
  })
    .select("-reactions -__v")
    .sort("-likesAmount")
    .limit(limit)
    .populate({
      path: "author tags.user",
      select: "userName profileImg",
    });

  res.status(200).json(posts);
});

exports.getTopRatedPublishers = asyncWrapper(async function (req, res, next) {
  const { limit } = req.query;

  const topRatedPublishers = await Post.aggregate([
    {
      $match: { type: "blogPost" },
    },
    {
      $project: { author: 1, likesAmount: 1 },
    },
    {
      $group: {
        _id: "$author",
        posts: { $sum: 1 },
        likes: { $sum: "$likesAmount" },
      },
    },
    {
      $sort: { likes: -1 },
    },
    {
      $limit: +limit || 3,
    },
    {
      $lookup: {
        as: "author",
        from: "users",
        foreignField: "_id",
        localField: "_id",
        pipeline: [
          {
            $project: {
              userName: 1,
              profileImg: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$author",
    },
  ]);

  res.status(200).json(topRatedPublishers);
});

exports.getRelatedPosts = asyncWrapper(async function (req, res, next) {
  const { postId } = req.params;
  const { limit } = req.query;

  const { labels, category } = await Post.findById(postId).select(
    "labels category"
  );

  const posts = await Post.aggregate([
    {
      $match: {
        type: "blogPost",
        labels: { $in: labels },
        // category: category,
        _id: { $ne: mongoose.Types.ObjectId(postId) },
      },
    },
    {
      $addFields: {
        matched: { $setIntersection: ["$labels", labels] },
      },
    },
    {
      $unwind: "$matched",
    },
    {
      $group: {
        _id: "$_id",
        size: { $sum: 1 },
      },
    },
    {
      $sort: { size: -1 },
    },
    {
      $limit: +limit,
    },
    {
      $lookup: {
        as: "posts",
        from: "posts",
        foreignField: "_id",
        localField: "_id",
        pipeline: [
          {
            $lookup: {
              as: "author",
              from: "users",
              foreignField: "_id",
              localField: "author",
              pipeline: [
                {
                  $project: {
                    userName: 1,
                    profileImg: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              as: "tags",
              from: "users",
              foreignField: "_id",
              localField: "tags.user",
              pipeline: [
                {
                  $project: {
                    userName: 1,
                    profileImg: 1,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $unwind: "$posts",
    },
    {
      $unset: ["posts.reactions"],
    },
    {
      $unwind: "$posts.author",
    },
  ]);

  const relatedPosts = posts.map((post) => post.posts);

  res.status(200).json(relatedPosts);
});
