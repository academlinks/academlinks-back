import Notification from '../models/Notification.js';
import AppError from '../lib/AppError.js';

export async function controllAddCommentNotification({ post, comment, parentCommentAuthorId }) {
  const postAuthor = post.author.toString();

  const commentAuthor = comment.author._id.toString();

  const usersTaggedOnPost = post.tags
    .map((user) => user.toString())
    .filter((user) => user !== postAuthor && user !== commentAuthor);

  const usersTaggedOnComment = comment.tags
    .map((user) => user._id.toString())
    .filter(
      (user) => user !== postAuthor && user !== commentAuthor && !usersTaggedOnPost.includes(user)
    );

  const parentCommentAuthor = parentCommentAuthorId;

  const operations = [];

  if (postAuthor !== commentAuthor)
    operations.push({
      message: 'comment on your post',
      adressats: [postAuthor],
      from: comment.author._id,
      location: post._id,
    });
  if (usersTaggedOnPost[0])
    operations.push({
      message: 'comment on the post on which you are tagged',
      adressats: usersTaggedOnPost,
      from: comment.author._id,
      location: post._id,
    });
  if (usersTaggedOnComment[0])
    operations.push({
      message: 'mentioned you in the comment',
      adressats: usersTaggedOnComment,
      from: comment.author._id,
      location: post._id,
    });
  if (parentCommentAuthor && parentCommentAuthor !== commentAuthor)
    operations.push({
      message: 'replied on your comment',
      adressats: [parentCommentAuthor],
      from: comment.author._id,
      location: post._id,
    });

  if (operations[0])
    await Promise.allSettled(
      operations.map(async (task) => {
        await Promise.allSettled(
          task.adressats.map(async (adressat) => {
            await createNotification({
              adressat,
              message: task.message,
              from: task.from,
              location: task.location,
            });
          })
        );
      })
    );
}

export async function controllReactOnCommentNotification({
  post,
  comment,
  parentCommentAuthorId,
}) {}

async function createNotification(body) {
  try {
    await Notification.create(body);
  } catch (error) {
    console.log(error);
  }
}
