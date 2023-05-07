const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const ConversationSchema = new Schema(
  {
    users: [
      {
        type: Schema.ObjectId,
        ref: "User",
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

    lastMessage: {
      isRead: {
        type: Boolean,
        default: false,
      },
      author: String,
      message: String,
      createdAt: Date,
    },

    seen: {
      type: Boolean,
      default: false,
    },

    deletedUsers: [
      {
        isDeleted: Boolean,
        cachedUserName: String,
        cachedUserId: String,
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ConversationSchema.virtual("messages", {
  ref: "Message",
  foreignField: "conversation",
  localField: "_id",
});

ConversationSchema.pre("save", function (next) {
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

const Conversation = model("Conversation", ConversationSchema);

module.exports = Conversation;
