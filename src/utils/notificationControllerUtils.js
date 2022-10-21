import Notification from '../models/Notification.js';
import Post from '../models/Post.js';

export async function controllAddCommentNotification({
  post,
  comment,
  parentCommentId,
  parentCommentAuthorId,
}) {
  const postAuthor = post.author.toString();
  const postType = post.type === 'blogPost' ? 'blog post' : 'post';

  const commentAuthor = comment.author._id.toString();

  const usersTaggedOnPost = post.tags
    .map((tag) => tag.user.toString())
    .filter((user) => user !== postAuthor && user !== commentAuthor);

  const usersTaggedOnComment = comment.tags
    .map((user) => user._id.toString())
    .filter(
      (user) => user !== postAuthor && user !== commentAuthor && !usersTaggedOnPost.includes(user)
    );

  const parentCommentAuthor = parentCommentAuthorId;

  const operations = [];

  function generateTaskBody({ message, adressats }) {
    return {
      message: message,
      adressats: adressats,
      from: comment.author._id,
      location: post._id,
      target: {
        targetType: post.type,
        options: {
          commentId: parentCommentId || comment._id,
          replyId: parentCommentId ? comment._id : '',
        },
      },
    };
  }

  if (postAuthor !== commentAuthor)
    operations.push(
      generateTaskBody({
        message: `comment on your ${postType}`,
        adressats: [postAuthor],
      })
    );

  if (usersTaggedOnPost[0])
    operations.push(
      generateTaskBody({
        message: `comment on the ${postType} on which you are tagged`,
        adressats: usersTaggedOnPost,
      })
    );

  if (usersTaggedOnComment[0])
    operations.push(
      generateTaskBody({
        message: 'mentioned you in the comment',
        adressats: usersTaggedOnComment,
      })
    );

  if (parentCommentAuthor && parentCommentAuthor !== commentAuthor)
    operations.push(
      generateTaskBody({
        message: 'replied on your comment',
        adressats: [parentCommentAuthor],
      })
    );

  if (operations[0]) await generateNotifications(operations);
}

export async function controllUpdateCommentNotification({
  postId,
  comment,
  newTags,
  parentCommentId,
}) {
  const post = await Post.findById(postId).select('type');

  const operations = [
    {
      message: 'mentioned you in the comment',
      adressats: newTags,
      from: comment.author,
      location: postId,
      target: {
        targetType: post?.type,
        options: {
          commentId: parentCommentId || comment._id,
          replyId: parentCommentId ? comment._id : '',
        },
      },
    },
  ];

  await generateNotifications(operations);
}

export async function controllCreatePostNotification({ post, tags, newTags }) {
  const postAuthor = post.author._id.toString();

  const existingTags = post.tags
    .map((tag) => tag.user.toString())
    .filter((user) => user !== postAuthor);

  const usersTaggedOnPost = tags.filter((tag) => tag !== postAuthor && !existingTags.includes(tag));

  const postType = post.type === 'blogPost' ? 'blog post' : 'post';

  const operations = [
    {
      message: `tag you in the ${postType}`,
      adressats: newTags || usersTaggedOnPost,
      from: postAuthor,
      location: post._id,
      target: {
        targetType: postType,
        options: {
          isNewTag: true,
        },
      },
    },
  ];

  await generateNotifications(operations);
}

export async function controllSharePostNotification({ post, tags }) {
  const postAuthor = post.author._id.toString();
  const authenticPostAuthor = post.authentic.author._id.toString();
  const postType = post.authentic.type === 'blogPost' ? 'blog post' : 'post';
  let postTags = [];

  if (tags && JSON.parse(tags)[0]) postTags = JSON.parse(tags);

  const operations = [];

  function generateTaskBody({ message, adressats, options }) {
    const task = {
      message,
      adressats,
      from: postAuthor,
      location: post._id,
      target: {
        targetType: 'post',
      },
    };

    if (options) task.target.options = options;

    return task;
  }

  if (postTags[0])
    operations.push(
      generateTaskBody({
        message: `tag you in the post`,
        adressats: postTags.filter((tag) => tag !== authenticPostAuthor),
        options: { isNewTag: true },
      })
    );

  if (postTags[0] && postTags.includes(authenticPostAuthor))
    operations.push(
      generateTaskBody({
        message: `share your ${postType} and tag you on the post`,
        adressats: [authenticPostAuthor],
        options: { isNewTag: true },
      })
    );

  if ((postTags[0] && !postTags.includes(authenticPostAuthor)) || !postTags[0])
    operations.push(
      generateTaskBody({
        message: `share your ${postType}`,
        adressats: [authenticPostAuthor],
      })
    );

  await generateNotifications(operations);
}

//////////////////////////////
////////// HELPERS //////////
////////////////////////////
async function generateNotifications(operations) {
  await Promise.allSettled(
    operations.map(async (task) => {
      await Promise.allSettled(
        task.adressats.map(async (adressat) => {
          await createNotification({
            adressat,
            message: task.message,
            from: task.from,
            location: task.location,
            target: task.target,
          });
        })
      );
    })
  );
}

async function createNotification(body) {
  try {
    await Notification.create(body);
  } catch (error) {
    console.log(error);
  }
}
