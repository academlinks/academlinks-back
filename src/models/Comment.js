const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const CommentSchema = new Schema(
  {
    post: {
      type: String,
    },

    author: {
      type: Schema.ObjectId,
      ref: "User",
    },

    text: {
      type: String,
      require: [true, "text field can't be empty"],
    },

    tags: [
      {
        type: Schema.ObjectId,
        ref: "User",
      },
    ],

    reactions: [
      {
        reaction: Boolean,
        author: {
          type: Schema.ObjectId,
          ref: "User",
        },
      },
    ],

    likesAmount: {
      type: Number,
      default: 0,
    },

    replies: [
      {
        author: {
          type: Schema.ObjectId,
          ref: "User",
        },

        tags: [
          {
            type: Schema.ObjectId,
            ref: "User",
          },
        ],

        text: String,

        pin: {
          type: Boolean,
          default: false,
        },

        reactions: [
          {
            reaction: Boolean,
            author: {
              type: Schema.ObjectId,
              ref: "User",
            },
          },
        ],

        likesAmount: {
          type: Number,
          default: 0,
        },

        createdAt: {
          type: Date,
          default: new Date(),
        },

        cachedUser: {
          isDeleted: Boolean,
          userName: String,
          cachedUserId: String,
        },
      },
    ],

    repliesAmount: {
      type: Number,
      default: 0,
    },

    pin: {
      type: Boolean,
      default: false,
    },

    cachedUser: {
      isDeleted: Boolean,
      userName: String,
      cachedUserId: String,
    },
  },
  { timestamps: true }
);

// CommentSchema.index({ post: 1 });

CommentSchema.pre("^find", async function (next) {
  await this.populate("author");
  next();
});

CommentSchema.pre("save", function (next) {
  if (!this.isModified("reactions")) return next();
  this.likesAmount = this.reactions.length;
  next();
});

CommentSchema.methods.controllCommentReplyLikes = async function (replyId) {
  const reply = this.replies.find((reply) => reply._id === replyId);
  reply.likesAmount = reply.reactions.length;
};

const Comment = model("Comment", CommentSchema);

module.exports = Comment;
