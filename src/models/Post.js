import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const PostSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['blogPost', 'post'],
      require: true,
    },
    author: {
      type: Schema.ObjectId,
      ref: 'User',
    },
    description: {
      type: String,
    },
    media: {
      type: [String],
    },
    tags: [
      {
        type: Schema.ObjectId,
        ref: 'User',
      },
    ],
    reactions: {
      type: [
        {
          reaction: Boolean,
          author: {
            type: Schema.ObjectId,
            ref: 'User',
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
    categories: {
      type: [String],
    },
    shared: {
      type: Boolean,
      default: false,
    },
    authentic: {
      type: Schema.ObjectId,
      ref: 'Post',
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

PostSchema.index({ author: 1 });

PostSchema.virtual('comments', {
  ref: 'Comment',
  foreignField: 'post',
  localField: '_id',
});

PostSchema.pre('save', function (next) {
  if (!this.isModified('reactions')) return next();
  this.likesAmount = this.reactions.filter((reaction) => reaction.reaction === true).length;
  this.dislikesAmount = this.reactions.filter((reaction) => reaction.reaction === false).length;
  next();
});

const Post = model('Post', PostSchema);

export default Post;
