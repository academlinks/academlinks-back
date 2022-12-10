import mongoose from "mongoose";
const { Schema, model } = mongoose;

const OnlineUsersSchema = new Schema({
  userName: String,
  email: String,
  image: String,
  userId: String,
  socketId: String,
});

const OnlineUsers = model("OnlineUsers", OnlineUsersSchema);

export default OnlineUsers;
