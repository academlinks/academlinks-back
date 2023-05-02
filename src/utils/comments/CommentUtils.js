const { Post, Comment } = require("../../models");
const { AppError } = require("../../lib");

class CommentUtils {
  /**
   * takes commentId and replyId from req.params and base on that finds and checks existance of comment,commentReply and post on which comment was writen
   * @params {req,next,checkBody,checkReplyAccess} param0
   * @param  req server request
   * @param next  next midleware
   * @param checkBody  boolean | by default is true | checks if comment body is empty or not. And if does not exists throws an error
   * @param checkReplyAccess boolean | by default is false | if true it checks if specific comment replies thread includes comment reply on which request happens. If is true and comment reply does not exists throws an error
   * @returns {Post Comment, CommentReply}
   */
  async controllCommentAccess({
    req,
    next,
    checkBody = true,
    checkReplyAccess = false,
  }) {
    try {
      const { text } = req.body;
      const { commentId, replyId } = req.params;

      const tags =
        req.body.tags && Array.isArray(req.body.tags) ? req.body.tags : [];

      if (checkBody && !text && !tags[0])
        return next(new AppError(400, "comment is empty"));

      const comment = await Comment.findById(commentId);

      if (!comment) return next(new AppError(400, "comment does not exists"));

      const post = await Post.findById(comment.post);

      if (!post)
        return next(
          new AppError(
            400,
            "post which one this comment belongs to does not exists"
          )
        );

      const credentials = { post, comment, text, tags };

      if (checkReplyAccess) {
        const commentReply = comment.replies.find(
          (rep) => rep._id.toString() === replyId
        );

        if (!commentReply)
          return next(new AppError(404, "comment reply does not exists"));

        credentials.commentReply = commentReply;
      }

      return credentials;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CommentUtils();
