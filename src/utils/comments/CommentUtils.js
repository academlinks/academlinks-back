const { Post, Comment } = require("../../models");
const { AppError } = require("../../lib");

class CommentUtils {
  checkCommentBody({ req, next }) {
    const { text } = req.body;

    const tags =
      req.body.tags && Array.isArray(req.body.tags) ? req.body.tags : [];

    if (!text && !tags[0]) return next(new AppError(400, "comment is empty"));

    return { text, tags };
  }

  async checkPostAndCommentExistance({ req, next }) {
    try {
      const { comment } = await this.checkCommentExistance({ req, next });

      const post = await Post.findById(comment.post).populate({
        path: "author",
        select: "userName",
      });

      if (!post) return next(new AppError(400, "post does not exists"));

      return { comment, post };
    } catch (error) {
      throw error;
    }
  }

  async checkCommentExistance({ req, next }) {
    try {
      const { commentId } = req.params;

      const comment = await Comment.findById(commentId);

      if (!comment) return next(new AppError(400, "comment does not exists"));

      return { comment };
    } catch (error) {
      throw error;
    }
  }

  checkCommentReplyExistance({ req, comment, next }) {
    const { replyId } = req.params;

    const commentReply = comment.replies.find(
      (rep) => rep._id.toString() === replyId
    );

    if (!commentReply)
      return next(new AppError(404, "comment reply does not exists"));

    return { commentReply };
  }

  manageCommentReaction({ comment, currUser }) {
    const existingReaction = comment.reactions.find(
      (reaction) => reaction.author.toString() === currUser.id
    );

    if (existingReaction)
      comment.reactions = comment.reactions.filter(
        (reaction) => reaction.author._id !== existingReaction.author._id
      );
    else
      comment.reactions.push({
        reaction: true,
        author: currUser.id,
      });
  }
}

module.exports = new CommentUtils();
