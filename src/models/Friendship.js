const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const FriendshipSchema = new Schema({
  user: Schema.ObjectId,
  sentRequests: [
    {
      adressat: {
        type: Schema.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
        default: new Date(),
      },
    },
  ],
  pendingRequests: [
    {
      adressat: {
        type: Schema.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
        default: new Date(),
      },
      seen: {
        type: Boolean,
        default: false,
      },
    },
  ],
  friends: [
    {
      friend: {
        type: Schema.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
        default: new Date(),
      },
    },
  ],
  friendsAmount: {
    type: Number,
    default: 0,
  },
});

FriendshipSchema.pre("save", function (next) {
  if (this.isModified("friends")) this.friendsAmount = this.friends.length;
  next();
});

FriendshipSchema.index({ user: 1 });

const Friendship = model("Friendship", FriendshipSchema);

module.exports = Friendship;
