import fs from 'fs';
import { promisify } from 'util';

import AppError from '../lib/AppError.js';

import Post from '../models/Post.js';

export function contollAudience(post, audience, type) {
  const audienceForBlogPost = ['public', 'users'];
  const audienceForPost = ['public', 'friends', 'private'];

  if (type === 'post' && !audienceForPost.includes(audience)) post.audience = 'friends';
  else if (type === 'blogPost' && !audienceForBlogPost.includes(audience)) post.audience = 'public';
  else post.audience = audience;
}

export async function controllPostCreation(req) {
  const { type, description, article, categories, tags, title, audience } = req.body;
  const currUser = req.user;

  const newPost = new Post({
    type,
    author: currUser.id,
    tags: tags && JSON.parse(tags).map((tag) => ({ user: tag })),
  });

  contollAudience(newPost, audience, type);

  if (type === 'post') {
    newPost.description = description;
  } else if (type === 'blogPost') {
    newPost.article = article;
    newPost.categories = categories && JSON.parse(categories);
    newPost.title = title;
  }

  return newPost;
}

export async function controllPostMediaDeletion(media, next) {
  const deletion = promisify(fs.unlink);

  Promise.all(
    media.map(async (media) => {
      try {
        const originalFileName = media.split('/')?.slice(3)[0];
        await deletion(`public/images/${originalFileName}`);
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
}

export async function controllPostUpdateBody({ req, postType, existingTags }) {
  const body = {};
  const availableKeys = ['description', 'tags', 'article', 'categories', 'title', 'audience'];

  Object.keys(req.body)
    .filter((key) => availableKeys.includes(key))
    .forEach((key) => {
      if (key === 'audience') contollAudience(body, req.body[key], postType);
      if (key === 'tags' || key === 'categories') body[key] = JSON.parse(req.body[key]);
      else body[key] = req.body[key];
    });

  if (body.tags) {
    const filteredExisting = existingTags.filter((tag) => body.tags.includes(tag.user.toString()));
    const filteredExistingIds = filteredExisting.map((tag) => tag.user.toString());
    const filteredBodyTags = body.tags
      .filter((tag) => !filteredExistingIds.includes(tag))
      .map((tag) => ({ user: tag }));
    body.tags = [...filteredExisting, ...filteredBodyTags];
  }

  return body;
}

export async function controllPostMediaOnUpdate({ req, next, post }) {
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
            const originalFileName = file.split('/')?.slice(3)[0];
            await deletion(`public/images/${originalFileName}`);
          } else filteredMedia.push(file);
        } catch (error) {
          return next(
            new AppError(
              403,
              "something went wrong, cant't find and delete removed post media files which are attached to your post.  please report the problem or try later"
            )
          );
        }
      })
    );

  if (!shared && req.files) {
    const newFiles = req.xOriginal.map(
      (fileName) => `${req.protocol}://${'localhost:4000'}/${fileName}`
    );

    const modifiedExistingFiles = filteredMedia[0] ? filteredMedia : [];

    // const matchModifiedFilesToExisting = promisify(fs.existsSync);
    // const match = await matchModifiedFilesToExisting(`public/images/${originalFileName}`);

    post.media = [...modifiedExistingFiles, ...newFiles];
  } else if (!shared && filteredMedia[0]) post.media = media;
}

export async function controllPostReaction({ post, currUserId, reaction }) {
  const existingReaction = post.reactions.find(
    (reaction) => reaction.author.toString() === currUserId
  );

  if (existingReaction) {
    if (existingReaction.reaction === reaction)
      post.reactions = post.reactions.filter(
        (reaction) => reaction.author.toString() !== currUserId
      );
    else if (existingReaction.reaction !== reaction) existingReaction.reaction = reaction;
  } else
    post.reactions.push({
      reaction,
      author: currUserId,
    });
}
