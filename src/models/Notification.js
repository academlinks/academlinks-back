import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const NotificationSchema = new Schema(
  {
    location: String,
    message: String,
    adressat: {
      type: Schema.ObjectId,
      ref: 'User',
    },
    from: {
      type: Schema.ObjectId,
      ref: 'User',
    },
    read: {
      type: Boolean,
      default: false,
    },
    target: {
      enum: ['post', 'blogPost', 'request'],
      type: String,
    },
  },
  { timestamps: true }
);

const Notification = model('Notification', NotificationSchema);

export default Notification;
