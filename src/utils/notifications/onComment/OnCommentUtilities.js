const Notification = require("../Notification");

class OnCommentUtilities extends Notification {
  constructor() {
    super();
  }

  generateReplyThreadOperations({
    createOperation,
    postType,
    postAuthor,
    postAuthorUserName,
    parentCommentAuthor,
    commentAuthor,
    usersTaggedOnPost,
    usersTaggedOnComment,
    commentTagsIncludesPostAuthor,
  }) {
    const isReplyToUserTaggedOnPost = usersTaggedOnPost.some(
      (tag) => parentCommentAuthor === tag && commentAuthor !== tag
    );

    /////////////////////////////////////
    ////////// to post author //////////
    ///////////////////////////////////
    if (
      postAuthor === parentCommentAuthor &&
      parentCommentAuthor !== commentAuthor
    ) {
      createOperation({
        message:
          this.NOTIFICATION_PLACEHOLDERS.onCommentToPostAuthorMentioned(
            postType
          ),
        adressats: [postAuthor],
      });
    } else if (
      postAuthor !== parentCommentAuthor &&
      postAuthor !== commentAuthor &&
      commentTagsIncludesPostAuthor
    ) {
      createOperation({
        message:
          this.NOTIFICATION_PLACEHOLDERS.onCommentToPostAuthorMentioned(
            postType
          ),
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
        message: this.NOTIFICATION_PLACEHOLDERS.onCommentToPostAuthor(postType),
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
        message: this.NOTIFICATION_PLACEHOLDERS.onCommentAuthor(postType),
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
          this.NOTIFICATION_PLACEHOLDERS.onCommentReplyToUserAreTagedOnPostAndOnCommentTo(
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

  generateOperationForUsersTaggedOnPost({
    createOperation,
    postType,
    postAuthorUserName,
    usersTaggedOnPost,
    usersTaggedOnComment,
  }) {
    const commentTagsIncludesUsersTaggedOnPost = usersTaggedOnPost.some((tag) =>
      usersTaggedOnComment.includes(tag)
    );

    if (commentTagsIncludesUsersTaggedOnPost) {
      createOperation({
        message:
          this.NOTIFICATION_PLACEHOLDERS.onCommentToUserAreTagedOnPostAndOnCommentTo(
            postType
          ),
        options: { postAuthorUserName },
        adressats: usersTaggedOnPost.filter((tag) =>
          usersTaggedOnComment.includes(tag)
        ),
      });
      createOperation({
        message:
          this.NOTIFICATION_PLACEHOLDERS.onCommentToUserAreTagedOnPost(
            postType
          ),
        options: { postAuthorUserName },
        adressats: usersTaggedOnPost.filter(
          (tag) => !usersTaggedOnComment.includes(tag)
        ),
      });
    } else {
      createOperation({
        message:
          this.NOTIFICATION_PLACEHOLDERS.onCommentToUserAreTagedOnPost(
            postType
          ),
        options: { postAuthorUserName },
        adressats: usersTaggedOnPost,
      });
    }

    usersTaggedOnComment = usersTaggedOnComment.filter(
      (tag) => !usersTaggedOnPost.includes(tag)
    );
  }

  generateOperationForUsersTaggedOnComment({
    createOperation,
    postType,
    postAuthorUserName,
    usersTaggedOnComment,
  }) {
    createOperation({
      message:
        this.NOTIFICATION_PLACEHOLDERS.onCommentUsersAreTaggedOnComment(
          postType
        ),
      options: { postAuthorUserName },
      adressats: usersTaggedOnComment,
    });
  }

  generateMainThreadOperations({
    createOperation,
    postType,
    postAuthor,
    commentAuthor,
    usersTaggedOnComment,
    commentTagsIncludesPostAuthor,
  }) {
    if (postAuthor !== commentAuthor && !commentTagsIncludesPostAuthor) {
      createOperation({
        message: this.NOTIFICATION_PLACEHOLDERS.onCommentToPostAuthor(postType),
        adressats: [postAuthor],
      });
    } else if (postAuthor !== commentAuthor && commentTagsIncludesPostAuthor) {
      createOperation({
        message:
          this.NOTIFICATION_PLACEHOLDERS.onCommentToPostAuthorMentioned(
            postType
          ),
        adressats: [postAuthor],
      });

      usersTaggedOnComment = usersTaggedOnComment.filter(
        (tag) => tag !== postAuthor
      );
    }
  }
}

module.exports = OnCommentUtilities;
