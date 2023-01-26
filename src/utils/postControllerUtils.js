const fs = require("fs");
const { promisify } = require("util");

const AppError = require("../lib/AppError.js");

const Post = require("../models/Post.js");
const { getServerHost } = require("../lib/getOrigins.js");

exports.contollAudience = function (post, audience, type) {
  const audienceForBlogPost = ["public", "users"];
  const audienceForPost = ["public", "friends", "private"];

  if (type === "post" && !audienceForPost.includes(audience))
    post.audience = "friends";
  else if (type === "blogPost" && !audienceForBlogPost.includes(audience))
    post.audience = "public";
  else post.audience = audience;
};

exports.controllPostCreation = async function (req) {
  const {
    type,
    description,
    article,
    labels,
    category,
    tags,
    title,
    audience,
  } = req.body;
  const currUser = req.user;

  const newPost = new Post({
    type,
    author: currUser.id,
    tags: tags && JSON.parse(tags).map((tag) => ({ user: tag })),
  });

  contollAudience(newPost, audience, type);

  if (type === "post") {
    newPost.description = description;
  } else if (type === "blogPost") {
    newPost.article = article;
    newPost.labels = labels && JSON.parse(labels);
    newPost.category = category;
    newPost.title = title;
  }

  return { newPost, tags };
};

exports.controllPostMediaDeletion = async function (
  media,
  next,
  destination = "public/images"
) {
  const deletion = promisify(fs.unlink);

  Promise.all(
    media.map(async (media) => {
      try {
        const originalFileName = media.split("/")?.slice(3)[0];
        await deletion(`${destination}/${originalFileName}`);
      } catch (error) {
        return next(
          new AppError(
            406,
            "something went wrong, cant't find and delete post media files which are attached to your post. please report the problem or try later"
          )
        );
      }
    })
  );
};

exports.controllPostUpdateBody = async function ({
  req,
  postType,
  existingTags,
}) {
  const body = {};

  const availableKeys = [
    "description",
    "tags",
    "article",
    "labels",
    "category",
    "title",
    "audience",
  ];

  let newTags;

  Object.keys(req.body)
    .filter((key) => availableKeys.includes(key))
    .forEach((key) => {
      if (key === "audience") contollAudience(body, req.body[key], postType);
      if (key === "labels" || key === "tags")
        body[key] = JSON.parse(req.body[key]);
      else body[key] = req.body[key];
    });

  const filteredExistingTagsIds = existingTags
    .filter((tag) => body.tags.includes(tag.user.toString()))
    ?.map((tag) => tag.user.toString());

  const filteredNewTags = body.tags
    .filter((tag) => !filteredExistingTagsIds.includes(tag))
    .map((tag) => ({ user: tag }));

  if (filteredNewTags?.[0]) {
    body.tags = [
      ...filteredExistingTagsIds.map((tag) => ({ user: tag })),
      ...filteredNewTags,
    ];

    newTags = filteredNewTags.map((tag) => tag.user);
  } else {
    body.tags = body.tags.map((tag) => ({ user: tag }));
  }

  return { body, newTags };
};

exports.controllPostMediaOnUpdate = async function ({ req, next, post }) {
  const { media } = req.body;

  const existingMedia = post.media;
  const shared = post.shared;

  const deletion = promisify(fs.unlink);

  const filteredMedia = [];
  if (!shared && existingMedia?.[0])
    Promise.all(
      existingMedia.map(async (file) => {
        try {
          if (!media?.includes(file)) {
            const originalFileName = file.split("/")?.slice(3)[0];
            await deletion(`public/images/${originalFileName}`);
          } else filteredMedia.push(file);
        } catch (error) {
          return next(
            new AppError(
              403,
              "Something went wrong, cant't find and delete removed post media files which are attached to your post.  Please report the problem or try again later"
            )
          );
        }
      })
    );

  if (!shared && req.files) {
    const newFiles = req.xOriginal.map(
      (fileName) => `${req.protocol}://${getServerHost()}/${fileName}`
    );

    const modifiedExistingFiles = filteredMedia[0] ? filteredMedia : [];

    // const matchModifiedFilesToExisting = promisify(fs.existsSync);
    // const match = await matchModifiedFilesToExisting(`public/images/${originalFileName}`);

    post.media = [...modifiedExistingFiles, ...newFiles];
  } else if (!shared && filteredMedia[0]) post.media = media;
};

exports.controllPostReaction = async function ({ post, currUserId, reaction }) {
  const existingReaction = post.reactions.find(
    (reaction) => reaction.author.toString() === currUserId
  );

  if (existingReaction) {
    if (existingReaction.reaction === reaction)
      post.reactions = post.reactions.filter(
        (reaction) => reaction.author.toString() !== currUserId
      );
    else if (existingReaction.reaction !== reaction)
      existingReaction.reaction = reaction;
  } else
    post.reactions.push({
      reaction,
      author: currUserId,
    });
};

exports.controllUserRelationToPost = async function ({ post, currUser }) {
  const isAuthor = post.author.toString() === currUser.id;
  const isTagged = post.tags.some((tag) => tag.user.toString() === currUser.id);

  return { isAuthor, isTagged };
};

exports.controllShowOnProfile = async function ({ currUser, post, task }) {
  const { isAuthor, isTagged } = await controllUserRelationToPost({
    post,
    currUser,
  });

  if (isAuthor)
    post.hidden = task === "add" ? false : task === "hide" ? true : undefined;
  else if (isTagged) {
    const i = post.tags.findIndex((tag) => tag.user.toString() === currUser.id);
    post.tags[i].hidden =
      task === "add" ? false : task === "hide" ? true : undefined;
  }
};
