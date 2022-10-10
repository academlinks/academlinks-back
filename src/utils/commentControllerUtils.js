import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import AppError from '../lib/AppError.js';

export async function controllCommentAccess({
  req,
  next,
  checkBody = true,
  checkReplyAccess = false,
}) {
  const { commentId, replyId } = req.params;

  if (checkBody) {
    const { text, tags } = req.body;
    if (!text && (!tags || tags?.[0])) return next(new AppError(400, 'comment is empty'));
  }

  const parentComment = await Comment.findById(commentId);

  if (!parentComment) return next(new AppError(400, 'comment does not exists'));

  const postToUpdate = await Post.findById(parentComment.post);

  if (!postToUpdate) return next(new AppError(400, 'post does not exists'));

  const credentials = {
    comment: parentComment,
    post: postToUpdate,
  };

  if (checkReplyAccess) {
    const i = parentComment.replies.findIndex((comm) => comm._id.toString() === replyId);

    const commentReply = parentComment.replies[i];

    if (!commentReply) return next(new AppError(404, 'comment does not exists'));

    credentials.commentReply = commentReply;
  }

  return credentials;
}
