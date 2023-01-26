const Post = require("../models/Post.js");
const Comment = require("../models/Comment.js");
const AppError = require("../lib/AppError.js");

/**
 * takes commentId and replyId from req.params and base on that finds and checks existance of comment,commentReply and post on which comment was writen
 * @params {req,next,checkBody,checkReplyAccess} param0
 * @param  req server request
 * @param next  next midleware
 * @param checkBody  boolean | by default is true | checks if comment body is empty or not. And if does not exists throws an error
 * @param checkReplyAccess boolean | by default is false | if true it checks if specific comment replies thread includes comment reply on which request happens. If is true and comment reply does not exists throws an error
 * @returns {Post Comment, CommentReply}
 */
async function controllCommentAccess({
  req,
  next,
  checkBody = true,
  checkReplyAccess = false,
}) {
  const { commentId, replyId } = req.params;

  if (checkBody) {
    const { text, tags } = req.body;
    if (!text && (!tags || tags?.[0]))
      return next(new AppError(400, "comment is empty"));
  }

  const parentComment = await Comment.findById(commentId);

  if (!parentComment) return next(new AppError(400, "comment does not exists"));

  const postToUpdate = await Post.findById(parentComment.post);

  if (!postToUpdate)
    return next(
      new AppError(
        400,
        "post which one this comment belongs to does not exists"
      )
    );

  const credentials = {
    comment: parentComment,
    post: postToUpdate,
  };

  if (checkReplyAccess) {
    const commentReply = parentComment.replies.find(
      (rep) => rep._id.toString() === replyId
    );

    if (!commentReply)
      return next(new AppError(404, "comment reply does not exists"));

    credentials.commentReply = commentReply;
  }

  return credentials;
}

module.exports = controllCommentAccess;
