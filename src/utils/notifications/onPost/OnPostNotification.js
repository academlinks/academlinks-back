const Notification = require("../Notification");

class OnPostNotification extends Notification {
  constructor() {
    super();
  }

  async sendNotificationOnPostCreate({ req, post, tags, newTags }) {
    try {
      const io = await this.useLazySocket(req);

      const postAuthor = post.author._id.toString();

      const existingTags = post.tags
        .map((tag) => tag.user.toString())
        .filter((user) => user !== postAuthor);

      const usersTaggedOnPost = tags.filter(
        (tag) => tag !== postAuthor && !existingTags.includes(tag)
      );

      const postType = post.type === "blogPost" ? "blog post" : "post";

      const operations = [
        this.generateTaskBody({
          from: postAuthor,
          adressats: newTags || usersTaggedOnPost,
          message: this.NOTIFICATION_PLACEHOLDERS.onPostTag(postType),
          location: post._id,
          targetType: post.type,
          options: { isNewTag: true },
        }),
      ];

      await this.generateNotifications({ operations, io });
    } catch (error) {
      throw error;
    }
  }

  async sendNotificationOnPostShare({ req, post, tags }) {
    try {
      const io = await this.useLazySocket(req);

      const postAuthor = post.author._id.toString();
      const authenticPostAuthor = post.authentic.author._id.toString();
      const postType =
        post.authentic.type === "blogPost" ? "blog post" : "post";
      let postTags = [];

      if (tags && JSON.parse(tags)[0]) postTags = JSON.parse(tags);

      const operations = [];

      const taskBody = {
        from: postAuthor,
        location: post._id,
        targetType: "post",
      };

      if (postTags[0])
        operations.push(
          this.generateTaskBody({
            ...taskBody,
            adressats: postTags.filter((tag) => tag !== authenticPostAuthor),
            message: this.NOTIFICATION_PLACEHOLDERS.onPostTag("post"),
            options: { isNewTag: true },
          })
        );

      if (postTags[0] && postTags.includes(authenticPostAuthor))
        operations.push(
          this.generateTaskBody({
            ...taskBody,
            adressats: [authenticPostAuthor],
            message:
              this.NOTIFICATION_PLACEHOLDERS.onPostShareAndTagAuthor(postType),
            options: { isNewTag: true },
          })
        );

      if (
        ((postTags[0] && !postTags.includes(authenticPostAuthor)) ||
          !postTags[0]) &&
        postAuthor !== authenticPostAuthor
      )
        operations.push(
          this.generateTaskBody({
            ...taskBody,
            adressats: [authenticPostAuthor],
            message: this.NOTIFICATION_PLACEHOLDERS.onPostShare(postType),
          })
        );

      if (operations[0]) await this.generateNotifications({ operations, io });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new OnPostNotification();
