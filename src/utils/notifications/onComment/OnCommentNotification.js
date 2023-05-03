const OnCommentUtilities = require("./OnCommentUtilities");

class OnCommentNotification extends OnCommentUtilities {
  constructor() {
    super();
  }

  async sendNotificationOnAddComment({
    req,
    post,
    comment,
    parentCommentId,
    parentCommentAuthor,
  }) {
    try {
      const io = await this.useLazySocket(req);

      let {
        postType,
        postAuthor,
        postAuthorUserName,
        commentAuthor,
        usersTaggedOnPost,
        usersTaggedOnComment,
      } = this.getGeneralInfo({ post, comment });

      const { operations, createOperation } = this.generateOperation({
        post,
        comment,
        postType,
        parentCommentId,
      });

      const commentTagsIncludesPostAuthor = usersTaggedOnComment.some(
        (tag) => tag === postAuthor
      );

      if (!parentCommentAuthor)
        this.generateMainThreadOperations({
          createOperation,
          postType,
          postAuthor,
          commentAuthor,
          usersTaggedOnComment,
          commentTagsIncludesPostAuthor,
        });

      if (parentCommentAuthor)
        this.generateReplyThreadOperations({
          createOperation,
          postType,
          postAuthor,
          postAuthorUserName,
          parentCommentAuthor,
          commentAuthor,
          usersTaggedOnPost,
          usersTaggedOnComment,
          commentTagsIncludesPostAuthor,
        });

      if (usersTaggedOnPost[0])
        this.generateOperationForUsersTaggedOnPost({
          createOperation,
          postType,
          postAuthorUserName,
          usersTaggedOnPost,
          usersTaggedOnComment,
        });

      if (usersTaggedOnComment[0])
        this.generateOperationForUsersTaggedOnComment({
          createOperation,
          postType,
          postAuthorUserName,
          usersTaggedOnComment,
        });

      if (operations[0]) await this.generateNotifications({ operations, io });
    } catch (error) {
      throw error;
    }
  }

  async sendNotificationOnUpdateComment({
    req,
    post,
    comment,
    parentCommentId,
    newTags,
  }) {
    try {
      const io = await this.useLazySocket(req);

      const { postType, postAuthorUserName, usersTaggedOnPost } =
        this.getGeneralInfo({
          post,
          comment,
        });

      const { operations, createOperation } = this.generateOperation({
        post,
        comment,
        postType,
        parentCommentId,
      });

      const commentTagsIncludesUsersTaggedOnPost = usersTaggedOnPost.some(
        (tag) => newTags.includes(tag)
      );

      if (commentTagsIncludesUsersTaggedOnPost) {
        createOperation({
          message:
            this.NOTIFICATION_PLACEHOLDERS.onCommentToUserAreTagedOnPostAndOnCommentTo(
              postType
            ),
          options: { postAuthorUserName },
          adressats: newTags.filter((tag) => usersTaggedOnPost.includes(tag)),
        });
      } else if (!commentTagsIncludesUsersTaggedOnPost) {
        createOperation({
          message:
            this.NOTIFICATION_PLACEHOLDERS.onCommentUsersAreTaggedOnComment(
              postType
            ),
          options: { postAuthorUserName },
          adressats: newTags.filter((tag) => !usersTaggedOnPost.includes(tag)),
        });
      }

      if (operations[0]) await this.generateNotifications({ operations, io });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new OnCommentNotification();
