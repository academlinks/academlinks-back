const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const PostSchema = new Schema(
  {
    audience: {
      type: String,
      enum: ["public", "friends", "private", "users"],
      default: "friends",
    },

    type: {
      type: String,
      enum: ["blogPost", "post"],
      require: true,
    },

    author: {
      type: Schema.ObjectId,
      ref: "User",
    },

    description: {
      type: String,
    },

    media: {
      type: [String],
    },

    tags: [
      {
        user: {
          type: Schema.ObjectId,
          ref: "User",
        },
        hidden: {
          type: Boolean,
          default: true,
        },
        review: {
          type: Boolean,
          default: false,
        },
      },
    ],

    reactions: {
      type: [
        {
          reaction: Boolean,
          author: {
            type: Schema.ObjectId,
            ref: "User",
          },
          createdAt: {
            type: Date,
            default: new Date(),
          },
        },
      ],
    },

    likesAmount: {
      type: Number,
      default: 0,
    },

    dislikesAmount: {
      type: Number,
      default: 0,
    },

    commentsAmount: {
      type: Number,
      default: 0,
    },

    article: {
      type: String,
    },

    title: {
      type: String,
    },

    labels: {
      type: [String],
    },

    category: {
      type: String,
      enum: [
        "education",
        "economics",
        "business",
        "law",
        "medicine",
        "psychology",
        "philosophy",
        "politics",
        "natural sciences",
        "exact sciences",
        "other",
      ],
    },

    shared: {
      type: Boolean,
      default: false,
    },

    authentic: {
      type: Schema.ObjectId,
      ref: "Post",
    },

    deleted: {
      type: Boolean,
      default: false,
    },

    hidden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

PostSchema.index({ author: 1 });

PostSchema.virtual("comments", {
  ref: "Comment",
  foreignField: "post",
  localField: "_id",
});

PostSchema.pre("save", function (next) {
  if (!this.isModified("reactions")) return next();
  this.likesAmount = this.reactions.filter(
    (reaction) => reaction.reaction === true
  ).length;
  this.dislikesAmount = this.reactions.filter(
    (reaction) => reaction.reaction === false
  ).length;
  next();
});

const Post = model("Post", PostSchema);

module.exports = Post;
