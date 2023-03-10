const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const NotificationSchema = new Schema(
  {
    message: String,

    from: {
      type: Schema.ObjectId,
      ref: "User",
    },

    isDeletedSender: {
      isDeletedUser: false,
      cachedUserName: String,
    },

    adressat: {
      type: Schema.ObjectId,
      ref: "User",
    },

    read: {
      type: Boolean,
      default: false,
    },

    seen: {
      type: Boolean,
      default: false,
    },

    location: String,

    target: {
      targetType: {
        enum: ["post", "blogPost", "user"],
        type: String,
      },
      options: {
        postAuthorUserName: String,
        commentId: String,
        replyId: String,
        isNewTag: Boolean,
        isRequested: Boolean,
        isConfirmed: Boolean,
      },
    },
  },
  { timestamps: true }
);

const Notification = model("Notification", NotificationSchema);

module.exports = Notification;
