import mongoose from "mongoose";
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
});

const Friendship = model("Friendship", FriendshipSchema);

export default Friendship;
