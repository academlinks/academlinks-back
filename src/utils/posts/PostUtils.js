const Utilities = require("./Utilities");
const { AppError } = require("../../lib");

class PostUtils extends Utilities {
  calcMonthAgo() {
    return new Date(new Date().setMonth(new Date().getMonth() - 1));
  }

  manageAudience({ post, audience, postType }) {
    this.setAudience({ post, audience, postType });
  }

  managePostCreation(req) {
    const reqBody = req.body;
    const currUser = req.user;

    const tags =
      reqBody.tags && Array.isArray(JSON.parse(reqBody.tags))
        ? JSON.parse(reqBody.tags)
        : [];

    const type = reqBody.type;

    const body = {
      type,
      author: currUser.id,
      tags: tags.map((tag) => ({ user: tag })),
    };

    if (type === this.typeForPost) {
      body.description = reqBody.description;
    } else if (type === this.typeForBlogPost) {
      body.article = reqBody.article;
      body.labels = reqBody.labels && JSON.parse(reqBody.labels);
      body.category = reqBody.category;
      body.title = reqBody.title;
    }

    if (req.files)
      body.media = req.xOriginal.map((fileName) =>
        this.generateFileName({ fileName })
      );

    this.setAudience({
      post: body,
      audience: reqBody.audience,
      postType: reqBody.type,
    });

    return { body, tags };
  }

  async managePostBodyOnUpdate({ req, next, post }) {
    try {
      const updatedPost = {};

      const postType = post.type;

      // generate new post body from req.body
      this.generatePostBody({ req, body: updatedPost, postType });

      const existingTags = post.tags;
      const updatedPostTags = updatedPost.tags || [];
      const { newTags } = this.setTagsOnBody({
        existingTags,
        newTags: updatedPostTags,
        body: updatedPost,
      });

      await this.managePostFilesOnUpdate({ req, next, post });

      return { body: updatedPost, newTags };
    } catch (error) {
      throw error;
    }
  }

  async managePostMediaDeletion({ media, next }) {
    try {
      await Promise.all(
        media.map(async (media) => await this.unlinkFile({ media }))
      );
    } catch (error) {
      return next(
        new AppError(
          406,
          "something went wrong, please report the problem or try again later"
        )
      );
    }
  }

  managePostReaction({ post, currUserId, reaction }) {
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
  }

  manageShowOnProfile({ currUser, post, task }) {
    const { belongsToUser, isTagged } = this.watchUserRelationToPost({
      post,
      currUser,
    });

    const show = task === "add" ? false : task === "hide" ? true : undefined;

    if (belongsToUser) post.hidden = show;
    else if (isTagged) {
      const currUserTagIndex = post.tags.findIndex(
        (tag) => tag.user.toString() === currUser.id
      );
      post.tags[currUserTagIndex].hidden = show;
    }
  }
}

module.exports = new PostUtils();
