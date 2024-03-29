const Utils = require("../Utils");
const { AppError } = require("../../lib");

class Utilities extends Utils {
  constructor() {
    super();
    this.availableBlogPostAudience = ["public", "users"];
    this.availablePostAudience = ["public", "friends", "private"];
    this.typeForPost = "post";
    this.typeForBlogPost = "blogPost";
    this.postUpdateableKeys = [
      "description",
      "tags",
      "article",
      "labels",
      "category",
      "title",
      "audience",
    ];
  }

  // GENERATORS
  generatePostBody({ req, body, postType }) {
    Object.keys(req.body)
      .filter((key) => this.postUpdateableKeys.includes(key))
      .forEach((key) => {
        if (key === "audience")
          this.setAudience({
            postType,
            post: body,
            audience: req.body[key],
          });
        if (key === "labels" || key === "tags")
          body[key] = JSON.parse(req.body[key]);
        else body[key] = req.body[key];
      });
  }

  // TAGS
  setTagsOnBody({ existingTags, newTags, body }) {
    const existingTagIds = this.filterExistingTagIds({
      newTags,
      existingTags,
    });

    let filteredNewTags = this.filterNewTags({
      newTags,
      existingTagIds,
    });

    if (filteredNewTags?.[0]) {
      body.tags = [
        ...filteredNewTags,
        ...existingTagIds.map((tag) => ({ user: tag })),
      ];
      filteredNewTags = filteredNewTags.map((tag) => tag.user);
    } else {
      body.tags = newTags[0] ? newTags.map((tag) => ({ user: tag })) : [];
    }

    return { newTags: filteredNewTags };
  }

  filterExistingTagIds({ existingTags, newTags }) {
    return existingTags
      .filter((tag) => newTags.includes(tag.user.toString()))
      ?.map((tag) => tag.user.toString());
  }

  filterNewTags({ existingTagIds, newTags }) {
    return newTags
      .filter((tag) => !existingTagIds.includes(tag))
      .map((tag) => ({ user: tag }));
  }

  // AUDIENCE
  setAudience({ post, audience, postType }) {
    if (
      postType === this.typeForPost &&
      this.availablePostAudience.includes(audience)
    )
      post.audience = audience;
    else if (
      postType === this.typeForBlogPost &&
      this.availableBlogPostAudience.includes(audience)
    )
      post.audience = audience;
    else post.audience = "public";
  }

  // FILES
  async managePostFilesOnUpdate({ req, next, post }) {
    try {
      const { media } = req.body;

      const shared = post.shared;
      const existingMedia = post.media;

      if (!shared && req.files) {
        const filteredMedia = await this.filterFiles({
          next,
          existingMedia,
          newMedia: media ? JSON.parse(media) : [],
        });

        const newFiles = req.xOriginal.map((fileName) =>
          this.generateFileName({ fileName })
        );

        const modifiedExistingFiles = filteredMedia[0] ? filteredMedia : [];

        post.media = [...modifiedExistingFiles, ...newFiles];
      } else if (!shared && filteredMedia[0]) post.media = media;
    } catch (error) {
      return next(
        new AppError(
          406,
          "something went wrong, please report the problem or try again later"
        )
      );
    }
  }

  async filterFiles({ next, existingMedia, newMedia }) {
    try {
      const filteredMedia = [];

      if (Array.isArray(existingMedia) && existingMedia[0])
        await Promise.all(
          existingMedia.map(async (media) => {
            try {
              if (!newMedia?.includes(media)) {
                await this.unlinkFile({ media });
              } else filteredMedia.push(media);
            } catch (error) {
              throw error;
            }
          })
        );

      return filteredMedia;
    } catch (error) {
      throw error;
    }
  }

  // USER
  watchUserRelationToPost({ post, bookmark, currUser }) {
    const postAuthor = post.author.toString();
    const belongsToUser = postAuthor === currUser.id;
    const tag = post.tags.find((tag) => tag.user.toString() === currUser.id);

    return {
      belongsToUser,
      isTagged: tag ? true : false,
      isTaggedAndIsVisible: tag ? !tag.hidden : false,
      belongsToUserAndIsVisible: belongsToUser ? !post.hidden : false,
      isBookmarked: bookmark !== undefined && bookmark !== null,
    };
  }
}

module.exports = Utilities;
