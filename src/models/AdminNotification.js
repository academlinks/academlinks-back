const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const AdminNotificationSchema = new Schema(
  {
    from: {
      type: Schema.ObjectId,
      ref: "User",
    },

    message: {
      type: String,
    },

    read: {
      type: Boolean,
      default: false,
    },

    seen: {
      type: Boolean,
      default: false,
    },

    options: {
      oldEmail: String,
      newEmail: String,
    },
  },
  { timestamps: true }
);

const AdminNotification = model("AdminNotification", AdminNotificationSchema);

module.exports = AdminNotification;
