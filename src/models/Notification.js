import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const NotificationSchema = new Schema(
  {
    message: String,
    adressat: String,
    from: String,
    location: String,
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = model('Notification', NotificationSchema);

export default Notification;
