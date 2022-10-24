import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const ConversationSchema = new Schema(
  {
    users: [
      {
        type: Schema.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    deletion: [
      {
        deleted: {
          type: Boolean,
        },
        deletedBy: String,
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ConversationSchema.virtual('messages', {
  ref: 'Message',
  foreignField: 'conversation',
  localField: '_id',
});

ConversationSchema.pre('save', function (next) {
  console.log('runs middleware');
  if (!this.isNew) return next();

  const temp = [];
  this.users.map((user) => {
    temp.push({
      deleted: false,
      deletedBy: user.toString(),
    });
  });

  this.deletion = temp;

  next();
});

const Conversation = model('Conversation', ConversationSchema);

export default Conversation;
