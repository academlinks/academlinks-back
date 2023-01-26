const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const MessageSchema = new Schema(
  {
    conversation: {
      type: String,
      required: true,
    },
    author: {
      type: Schema.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    deletion: [
      {
        deleted: {
          type: Boolean,
          default: false,
        },
        deletedBy: String,
      },
    ],
  },
  { timestamps: true }
);

const Message = model("Message", MessageSchema);

module.exports = Message;
