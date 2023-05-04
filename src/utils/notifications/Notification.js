const { IO } = require("../../lib");
const { Notification: NotificationModel } = require("../../models");
const { NOTIFICATION_PLACEHOLDERS } = require("../../config");

class Notification {
  constructor() {
    this.NOTIFICATION_PLACEHOLDERS = NOTIFICATION_PLACEHOLDERS;
    this.IO_PLACEHOLDERS = IO.IO_PLACEHOLDERS;
    this.useLazySocket = IO.useLazySocket;
  }

  async createNotification(body) {
    try {
      await NotificationModel.create(body);
    } catch (error) {
      throw error;
    }
  }

  async generateNotifications({ operations, io }) {
    try {
      await Promise.allSettled(
        operations.map(async (task) => {
          await Promise.allSettled(
            task.adressats.map(async (adressat) => {
              await this.createNotification({
                adressat,
                message: task.message,
                from: task.from,
                location: task.location,
                target: task.target,
              });

              await io({
                data: 1,
                adressatId: adressat,
                operationName: this.IO_PLACEHOLDERS.receive_new_notification,
              });
            })
          );
        })
      );
    } catch (error) {
      throw error;
    }
  }

  generateOperation({ post, comment, postType, parentCommentId }) {
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
        operation.target.options = {
          ...operation.target.options,
          ...options,
        };

      operations.push(operation);
    }

    return { operations, createOperation };
  }

  generateTaskBody({
    from,
    adressats,
    message,
    location,
    options,
    targetType,
  }) {
    const task = {
      from,
      adressats,
      message,
      location,
      target: {
        targetType,
      },
    };

    if (options) task.target.options = options;

    return task;
  }

  getGeneralInfo({ post, comment }) {
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
}

module.exports = Notification;
