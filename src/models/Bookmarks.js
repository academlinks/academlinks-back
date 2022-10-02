import mongoose from 'mongoose';
const { model, Schema } = mongoose;

const BookmarksSchema = new Schema(
  {
    post: {
      type: Schema.ObjectId,
      ref: 'Post',
    },
    cachedId: {
      type: String,
    },
    author: {
      type: String,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

BookmarksSchema.pre('save', function (next) {
  if (this.isNew) this.cachedId = this.post;
  next();
});

const Bookmarks = model('Bookmark', BookmarksSchema);

export default Bookmarks;
