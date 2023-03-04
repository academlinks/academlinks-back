const Notification = require("../models/Notification.js");
const { useLazySocket, socket_name_placeholders } = require("./ioUtils.js");

const messages_placeholder = {
  // On Comments
  onCommentToPostAuthor: (postType) => `commented on your ${postType}`,
  onCommentToPostAuthorMentioned: (postType) =>
    `you're mentioned in the comment on your ${postType}`,
  onCommentToUserAreTagedOnPostAndOnCommentTo: (postType) =>
    `you're mentioned in the comment on ${"PostAuthorPlaceholder"}'s ${postType} on which you are tagged in`,
  onCommentReplyToUserAreTagedOnPostAndOnCommentTo: (postType) =>
    `replied on your comment on the ${"PostAuthorPlaceholder"}'s ${postType} on which you are tagged in`,
  onCommentToUserAreTagedOnPost: (postType) =>
    `commented on ${"PostAuthorPlaceholder"}'s ${postType} on which you are tagged in`,
  onCommentUsersAreTaggedOnComment: (postType) =>
    `you're mentioned in the comment on ${"PostAuthorPlaceholder"}'s ${postType}`,
  onCommentAuthor: (postType) =>
    `replied on your comment on ${"PostAuthorPlaceholder"}'s ${postType}`,
  // Friend Requests
  sendRequest: `sent you friend request`,
  confirmRequest: `confirmed your friend request`,
  // Post
  onPostTag: (postType) => `mentioned you in the ${postType}`,
  onPostShareAndTagAuthor: (postType) =>
    `share your ${postType} and mentioned you in the post`,
  onPostShare: (postType) => `share your ${postType}`,
};

async function controllAddCommentNotification({
  req,
  post,
  comment,
  parentCommentId,
  parentCommentAuthor,
}) {
  const sender = await useLazySocket(req);

  let {
    postType,
    postAuthor,
    postAuthorUserName,
    commentAuthor,
    usersTaggedOnPost,
    usersTaggedOnComment,
  } = await getGeneralInfo({ post, comment });

  const { operations, createOperation } = await generateOperation({
    post,
    comment,
    postType,
    parentCommentId,
  });

  const commentTagsIncludesPostAuthor = usersTaggedOnComment.some(
    (tag) => tag === postAuthor
  );

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
      createOperation({
        message: messages_placeholder.onCommentToPostAuthor(postType),
        adressats: [postAuthor],
      });
    } else if (postAuthor !== commentAuthor && commentTagsIncludesPostAuthor) {
      createOperation({
        message: messages_placeholder.onCommentToPostAuthorMentioned(postType),
        adressats: [postAuthor],
      });

      usersTaggedOnComment = usersTaggedOnComment.filter(
        (tag) => tag !== postAuthor
      );
    }
  }

  ///////////////////////////////////////
  ////////// is comment reply //////////
  /////////////////////////////////////
  if (parentCommentAuthor) {
    /////////////////////////////////////
    ////////// to post author //////////
    ///////////////////////////////////
    if (
      postAuthor === parentCommentAuthor &&
      parentCommentAuthor !== commentAuthor
    ) {
      createOperation({
        message: messages_placeholder.onCommentToPostAuthorMentioned(postType),
        adressats: [postAuthor],
      });
    } else if (
      postAuthor !== parentCommentAuthor &&
      postAuthor !== commentAuthor &&
      commentTagsIncludesPostAuthor
    ) {
      createOperation({
        message: messages_placeholder.onCommentToPostAuthorMentioned(postType),
        adressats: [postAuthor],
      });

      usersTaggedOnComment = usersTaggedOnComment.filter(
        (tag) => tag !== postAuthor
      );
    } else if (
      postAuthor !== parentCommentAuthor &&
      postAuthor !== commentAuthor &&
      !commentTagsIncludesPostAuthor
    ) {
      createOperation({
        message: messages_placeholder.onCommentToPostAuthor(postType),
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
      createOperation({
        message: messages_placeholder.onCommentAuthor(postType),
        options: { postAuthorUserName },
        adressats: [parentCommentAuthor],
      });

      usersTaggedOnComment = usersTaggedOnComment.filter(
        (tag) => tag !== parentCommentAuthor
      );
    }

    if (usersTaggedOnPost[0] && isReplyToUserTaggedOnPost) {
      createOperation({
        message:
          messages_placeholder.onCommentReplyToUserAreTagedOnPostAndOnCommentTo(
            postType
          ),
        options: { postAuthorUserName },
        adressats: [
          usersTaggedOnPost.find(
            (tag) =>
              usersTaggedOnComment.includes(tag) && parentCommentAuthor === tag
          ),
        ],
      });

      usersTaggedOnPost = usersTaggedOnPost.filter(
        (tag) => tag !== parentCommentAuthor
      );
      usersTaggedOnComment = usersTaggedOnComment.filter(
        (tag) => tag !== parentCommentAuthor
      );
    }
  }

  /////////////////////////////////////////////////////////
  ////////// to users who are tagged on the post /////////
  ///////////////////////////////////////////////////////
  if (usersTaggedOnPost[0]) {
    if (commentTagsIncludesUsersTaggedOnPost) {
      createOperation({
        message:
          messages_placeholder.onCommentToUserAreTagedOnPostAndOnCommentTo(
            postType
          ),
        options: { postAuthorUserName },
        adressats: usersTaggedOnPost.filter((tag) =>
          usersTaggedOnComment.includes(tag)
        ),
      });
      createOperation({
        message: messages_placeholder.onCommentToUserAreTagedOnPost(postType),
        options: { postAuthorUserName },
        adressats: usersTaggedOnPost.filter(
          (tag) => !usersTaggedOnComment.includes(tag)
        ),
      });
    } else {
      createOperation({
        message: messages_placeholder.onCommentToUserAreTagedOnPost(postType),
        options: { postAuthorUserName },
        adressats: usersTaggedOnPost,
      });
    }

    usersTaggedOnComment = usersTaggedOnComment.filter(
      (tag) => !usersTaggedOnPost.includes(tag)
    );
  }

  ////////////////////////////////////////////////////////////
  ////////// to users who are tagged on the comment /////////
  //////////////////////////////////////////////////////////
  if (usersTaggedOnComment[0]) {
    createOperation({
      message: messages_placeholder.onCommentUsersAreTaggedOnComment(postType),
      options: { postAuthorUserName },
      adressats: usersTaggedOnComment,
    });
  }

  if (operations[0]) await generateNotifications(operations, sender);
}

async function controllUpdateCommentNotification({
  req,
  post,
  comment,
  parentCommentId,
  newTags,
}) {
  const sender = await useLazySocket(req);

  const { postType, postAuthorUserName, usersTaggedOnPost } =
    await getGeneralInfo({
      post,
      comment,
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
      message:
        messages_placeholder.onCommentToUserAreTagedOnPostAndOnCommentTo(
          postType
        ),
      options: { postAuthorUserName },
      adressats: usersTaggedOnPost.filter((tag) => newTags.includes(tag)),
    });

    createOperation({
      message:
        messages_placeholder.onCommentToUserAreTagedOnPostAndOnCommentTo(
          postType
        ),
      options: { postAuthorUserName },
      adressats: usersTaggedOnPost.filter((tag) => !newTags.includes(tag)),
    });
  } else if (!commentTagsIncludesUsersTaggedOnPost) {
    createOperation({
      message: messages_placeholder.onCommentUsersAreTaggedOnComment(postType),
      options: { postAuthorUserName },
      adressats: newTags,
    });
  }

  if (operations[0]) await generateNotifications(operations, sender);
}

async function controllCreatePostNotification({ req, post, tags, newTags }) {
  const sender = await useLazySocket(req);

  const postAuthor = post.author._id.toString();

  const existingTags = post.tags
    .map((tag) => tag.user.toString())
    .filter((user) => user !== postAuthor);

  const usersTaggedOnPost = tags.filter(
    (tag) => tag !== postAuthor && !existingTags.includes(tag)
  );

  const postType = post.type === "blogPost" ? "blog post" : "post";

  const operations = [
    {
      message: messages_placeholder.onPostTag(postType),
      adressats: newTags || usersTaggedOnPost,
      from: postAuthor,
      location: post._id,
      target: {
        targetType: post.type,
        options: {
          isNewTag: true,
        },
      },
    },
  ];

  await generateNotifications(operations, sender);
}

async function controllSharePostNotification({ req, post, tags }) {
  const sender = await useLazySocket(req);

  const postAuthor = post.author._id.toString();
  const authenticPostAuthor = post.authentic.author._id.toString();
  const postType = post.authentic.type === "blogPost" ? "blog post" : "post";
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
        targetType: "post",
      },
    };

    if (options) task.target.options = options;

    return task;
  }

  if (postTags[0])
    operations.push(
      generateTaskBody({
        message: messages_placeholder.onPostTag("post"),
        adressats: postTags.filter((tag) => tag !== authenticPostAuthor),
        options: { isNewTag: true },
      })
    );

  if (postTags[0] && postTags.includes(authenticPostAuthor))
    operations.push(
      generateTaskBody({
        message: messages_placeholder.onPostShareAndTagAuthor(postType),
        adressats: [authenticPostAuthor],
        options: { isNewTag: true },
      })
    );

  if (
    ((postTags[0] && !postTags.includes(authenticPostAuthor)) ||
      !postTags[0]) &&
    postAuthor !== authenticPostAuthor
  )
    operations.push(
      generateTaskBody({
        message: messages_placeholder.onPostShare(postType),
        adressats: [authenticPostAuthor],
      })
    );

  if (operations[0]) await generateNotifications(operations, sender);
}

async function controllFriendRequestNotification({
  req,
  currUser,
  adressat,
  send,
  confirm,
}) {
  const sender = await useLazySocket(req);

  function generateTaskBody({ message, options, location }) {
    const task = {
      message,
      location,
      adressats: [adressat],
      from: currUser,
      target: {
        targetType: "user",
      },
    };

    if (options) task.target.options = options;

    return task;
  }

  const operations = [];

  if (send)
    operations.push(
      generateTaskBody({
        message: messages_placeholder.sendRequest,
        location: adressat,
        options: { isRequested: true },
      })
    );
  else if (confirm)
    operations.push(
      generateTaskBody({
        message: messages_placeholder.confirmRequest,
        location: currUser,
        options: { isConfirmed: true },
      })
    );

  if (operations[0]) await generateNotifications(operations, sender);
}

///////////////////////////////////
////////// MAIN HELPERS //////////
/////////////////////////////////
async function generateNotifications(operations, sender) {
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

          await sender({
            adressatId: adressat,
            operationName: socket_name_placeholders.receiveNewNotification,
            data: 1,
          });
        })
      );
    })
  );
}

async function createNotification(body) {
  try {
    await Notification.create(body);
  } catch (error) {}
}

//////////////////////////////////////
////////// COMMENT HELPERS //////////
////////////////////////////////////
async function getGeneralInfo({ post, comment }) {
  const postAuthor = post.author._id.toString();
  const postAuthorUserName = post.author.userName
    .split(" ")
    .map((fragment) => fragment[0].toUpperCase() + fragment.slice(1))
    .join(" ");

  const postType = post.type === "blogPost" ? "blog post" : "post";

  const commentAuthor = comment.author._id.toString();

  let usersTaggedOnPost = post.tags
    .map((tag) => tag.user.toString())
    .filter((user) => user !== postAuthor);

  let usersTaggedOnComment = comment.tags
    .map((user) => user._id.toString())
    .filter((user) => user !== commentAuthor);

  return {
    postAuthor,
    postAuthorUserName,
    postType,
    commentAuthor,
    usersTaggedOnPost,
    usersTaggedOnComment,
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
          replyId: parentCommentId ? comment._id : "",
        },
      },
    };

    if (options)
      operation.target.options = { ...operation.target.options, ...options };

    operations.push(operation);
  }

  return { operations, createOperation };
}

exports.controllAddCommentNotification = controllAddCommentNotification;
exports.controllUpdateCommentNotification = controllUpdateCommentNotification;
exports.controllCreatePostNotification = controllCreatePostNotification;
exports.controllSharePostNotification = controllSharePostNotification;
exports.controllFriendRequestNotification = controllFriendRequestNotification;
