import Notification from '../models/Notification.js';
import Post from '../models/Post.js';

export async function controllAddCommentNotification({
  post,
  comment,
  parentCommentId,
  parentCommentAuthorId,
}) {
  let {
    postType,
    postAuthor,
    postAuthorUserName,
    commentAuthor,
    parentCommentAuthor,
    usersTaggedOnPost,
    usersTaggedOnComment,
  } = await getGeneralUsers({ post, comment, parentCommentAuthorId });

  const { operations, createOperation } = await generateOperation({
    post,
    comment,
    postType,
    parentCommentId,
  });

  const commentTagsIncludesPostAuthor = usersTaggedOnComment.some((tag) => tag === postAuthor);
  const isReplyToUserTaggedOnPost = usersTaggedOnPost.some(
    (tag) => parentCommentAuthor === tag && commentAuthor !== tag
  );
  const commentTagsIncludesUsersTaggedOnPost = usersTaggedOnPost.some((tag) =>
    usersTaggedOnComment.includes(tag)
  );

  //////////////////////////////////////////////////
  ////////// is comment from main thread //////////
  ////////////////////////////////////////////////
  if (!parentCommentAuthor) {
    /////////////////////////////////////
    ////////// to post author //////////
    ///////////////////////////////////
    if (postAuthor !== commentAuthor && !commentTagsIncludesPostAuthor) {
      // console.log(13, ' - !parentCommentAuthor - ', 1);
      createOperation({
        message: `comment on your ${postType}`,
        adressats: [postAuthor],
      });
    } else if (postAuthor !== commentAuthor && commentTagsIncludesPostAuthor) {
      // console.log(13, ' - !parentCommentAuthor - ', 2);
      createOperation({
        message: `mentioned you in the comment on your ${postType}`,
        adressats: [postAuthor],
      });

      usersTaggedOnComment = usersTaggedOnComment.filter((tag) => tag !== postAuthor);
    }
  }

  ///////////////////////////////////////
  ////////// is comment reply //////////
  /////////////////////////////////////
  if (parentCommentAuthor) {
    /////////////////////////////////////
    ////////// to post author //////////
    ///////////////////////////////////
    if (postAuthor === parentCommentAuthor && parentCommentAuthor !== commentAuthor) {
      // console.log(13, ' - parentCommentAuthor - ', 1);
      createOperation({
        message: 'replied your comment on your post',
        adressats: [postAuthor],
      });
    } else if (
      postAuthor !== parentCommentAuthor &&
      postAuthor !== commentAuthor &&
      commentTagsIncludesPostAuthor
    ) {
      // console.log(13, ' - parentCommentAuthor - ', 2);
      createOperation({
        message: `mentioned you in the comment on your ${postType}`,
        adressats: [postAuthor],
      });

      usersTaggedOnComment = usersTaggedOnComment.filter((tag) => tag !== postAuthor);
    } else if (
      postAuthor !== parentCommentAuthor &&
      postAuthor !== commentAuthor &&
      !commentTagsIncludesPostAuthor
    ) {
      // console.log(13, ' - parentCommentAuthor - ', 3);
      createOperation({
        message: `comment on your ${postType}`,
        adressats: [postAuthor],
      });
    }

    ///////////////////////////////////////////////
    ////////// to parent comment author //////////
    /////////////////////////////////////////////
    if (
      postAuthor !== parentCommentAuthor &&
      parentCommentAuthor !== commentAuthor &&
      !isReplyToUserTaggedOnPost
    ) {
      // console.log(13, ' - parentCommentAuthor - ', 4);
      createOperation({
        message: `replied your comment on ${'PostAuthorPlaceholder'}'s ${postType}`,
        options: { postAuthorUserName },
        adressats: [parentCommentAuthor],
      });

      usersTaggedOnComment = usersTaggedOnComment.filter((tag) => tag !== parentCommentAuthor);
    }

    if (usersTaggedOnPost[0] && isReplyToUserTaggedOnPost) {
      // console.log(13, ' - parentCommentAuthor - ', 5);
      createOperation({
        message: `replied your comment on the ${'PostAuthorPlaceholder'}'s ${postType} on which you are tagged in`,
        options: { postAuthorUserName },
        adressats: [
          usersTaggedOnPost.find(
            (tag) => usersTaggedOnComment.includes(tag) && parentCommentAuthor === tag
          ),
        ],
      });

      usersTaggedOnPost = usersTaggedOnPost.filter((tag) => tag !== parentCommentAuthor);
      usersTaggedOnComment = usersTaggedOnComment.filter((tag) => tag !== parentCommentAuthor);
    }
  }

  /////////////////////////////////////////////////////////
  ////////// to users who are tagged on the post /////////
  ///////////////////////////////////////////////////////
  if (usersTaggedOnPost[0]) {
    if (commentTagsIncludesUsersTaggedOnPost) {
      // console.log(13, ' - commentTagsIncludesUsersTaggedOnPost - ', 1);
      createOperation({
        message: `mentioned you in the comment on the ${'PostAuthorPlaceholder'}'s ${postType} on which you are tagged in`,
        options: { postAuthorUserName },
        adressats: usersTaggedOnPost.filter((tag) => usersTaggedOnComment.includes(tag)),
      });
      createOperation({
        message: `comment on the ${'PostAuthorPlaceholder'}'s ${postType} on which you are tagged in`,
        options: { postAuthorUserName },
        adressats: usersTaggedOnPost.filter((tag) => !usersTaggedOnComment.includes(tag)),
      });
    } else {
      // console.log(13, ' - commentTagsIncludesUsersTaggedOnPost - ', 2);
      createOperation({
        message: `comment on the ${'PostAuthorPlaceholder'}'s ${postType} on which you are tagged in`,
        options: { postAuthorUserName },
        adressats: usersTaggedOnPost,
      });
    }

    usersTaggedOnComment = usersTaggedOnComment.filter((tag) => !usersTaggedOnPost.includes(tag));
  }

  ////////////////////////////////////////////////////////////
  ////////// to users who are tagged on the comment /////////
  //////////////////////////////////////////////////////////
  if (usersTaggedOnComment[0]) {
    // console.log(13, ' - usersTaggedOnComment - ', 1);
    createOperation({
      message: `mentioned you in the comment on the ${'PostAuthorPlaceholder'}'s ${postType}`,
      options: { postAuthorUserName },
      adressats: usersTaggedOnComment,
    });
  }

  if (operations[0]) await generateNotifications(operations);
}

export async function controllUpdateCommentNotification({
  post,
  comment,
  parentCommentId,
  parentCommentAuthorId,
  newTags,
}) {
  const { postType, postAuthorUserName, usersTaggedOnPost } = await getGeneralUsers({
    post,
    comment,
    parentCommentAuthorId,
  });

  const { operations, createOperation } = await generateOperation({
    post,
    comment,
    postType,
    parentCommentId,
  });

  const commentTagsIncludesUsersTaggedOnPost = usersTaggedOnPost.some((tag) =>
    newTags.includes(tag)
  );

  if (commentTagsIncludesUsersTaggedOnPost) {
    createOperation({
      message: `mentioned you in the comment on the ${'PostAuthorPlaceholder'}'s ${postType} on which you are tagged in`,
      options: { postAuthorUserName },
      adressats: usersTaggedOnPost.filter((tag) => newTags.includes(tag)),
    });

    createOperation({
      message: `mentioned you on the ${'PostAuthorPlaceholder'}'s ${postType}`,
      options: { postAuthorUserName },
      adressats: usersTaggedOnPost.filter((tag) => !newTags.includes(tag)),
    });
  } else if (!commentTagsIncludesUsersTaggedOnPost) {
    createOperation({
      message: `mentioned you on the ${'PostAuthorPlaceholder'}'s ${postType}`,
      options: { postAuthorUserName },
      adressats: newTags,
    });
  }

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

export async function controllFriendRequestNotification({ currUser, adressat, send, confirm }) {
  function generateTaskBody({ message, options, location }) {
    const task = {
      message,
      location,
      adressats: [adressat],
      from: currUser,
      target: {
        targetType: 'user',
      },
    };

    if (options) task.target.options = options;

    return task;
  }

  const operations = [];

  if (send)
    operations.push(
      generateTaskBody({
        message: `send you friend request`,
        location: adressat,
        options: { isRequested: true },
      })
    );
  else if (confirm)
    operations.push(
      generateTaskBody({
        message: `confirm your friend request`,
        location: currUser,
        options: { isConfirmed: true },
      })
    );

  await generateNotifications(operations);
}

///////////////////////////////////
////////// MAIN HELPERS //////////
/////////////////////////////////
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

//////////////////////////////////////
////////// COMMENT HELPERS //////////
////////////////////////////////////
async function getGeneralUsers({ post, comment, parentCommentAuthorId }) {
  const postAuthor = post.author._id.toString();
  const postAuthorUserName = post.author.userName
    .split(' ')
    .map((fragment) => fragment[0].toUpperCase() + fragment.slice(1))
    .join(' ');

  const postType = post.type === 'blogPost' ? 'blog post' : 'post';

  const commentAuthor = comment.author._id.toString();

  let usersTaggedOnPost = post.tags
    .map((tag) => tag.user.toString())
    .filter((user) => user !== postAuthor);

  let usersTaggedOnComment = comment.tags
    .map((user) => user._id.toString())
    .filter((user) => user !== commentAuthor);

  const parentCommentAuthor = parentCommentAuthorId;

  return {
    postAuthor,
    postAuthorUserName,
    postType,
    commentAuthor,
    usersTaggedOnPost,
    usersTaggedOnComment,
    parentCommentAuthor,
  };
}

async function generateOperation({ post, comment, postType, parentCommentId }) {
  const operations = [];

  function createOperation({ message, adressats, options }) {
    const operation = {
      message: message,
      adressats: adressats,
      from: comment.author._id,
      location: post._id,
      target: {
        targetType: postType,
        options: {
          commentId: parentCommentId || comment._id,
          replyId: parentCommentId ? comment._id : '',
        },
      },
    };

    if (options) operation.target.options = { ...operation.target.options, ...options };

    operations.push(operation);
  }

  return { operations, createOperation };
}

// (async function del() {
//   await Notification.deleteMany();
// })();
