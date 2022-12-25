import mongoose from "mongoose";
const { model, Schema } = mongoose;
import bcrypt from "bcryptjs";

const AdminSchema = new Schema({
  userName: {
    type: String,
  },
  password: {
    type: String,
    require: true,
    select: false,
  },
  role: {
    type: String,
    default: "admin",
  },
});

AdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

AdminSchema.methods.checkPassword = async function (
  candidatePassword,
  password
) {
  return await bcrypt.compare(candidatePassword, password);
};

const Admin = model("Admin", AdminSchema);

export default Admin;
