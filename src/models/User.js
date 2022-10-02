import mongoose from 'mongoose';
const { Schema, model } = mongoose;
import bcrypt from 'bcryptjs';

const UserSchema = new Schema(
  {
    firstName: {
      type: String,
      require: true,
    },
    lastName: {
      type: String,
      require: true,
    },
    userName: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      require: true,
    },
    birthDate: {
      type: Date,
    },
    from: {
      country: String,
      city: String,
    },
    currentLivingPlace: {
      country: String,
      city: String,
    },
    workplace: [
      {
        company: String,
        position: String,
        description: String,
        workingYears: {
          from: Date,
          to: Date,
        },
      },
    ],
    education: [
      {
        collage: String,
        faculty: String,
        degree: {
          type: String,
          enum: ['bachelor', 'master', 'doctor', 'proffesor'],
        },
        description: String,
        years: {
          from: Date,
          to: Date,
        },
      },
    ],
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    profileImg: {
      type: String,
      default: 'http://localhost:4000/avatars/profile-default.jpg',
    },
    coverImg: {
      type: String,
      default: 'http://localhost:4000/avatars/cover-default.jpg',
    },
    sentRequests: [
      {
        adressat: {
          type: Schema.ObjectId,
          ref: 'User',
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
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: new Date(),
        },
      },
    ],
    friends: [
      {
        friend: {
          type: Schema.ObjectId,
          ref: 'User',
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
    password: {
      type: String,
      require: true,
      select: false,
    },
  },
  { timestamps: true }
);

UserSchema.index({ userName: 1 });

UserSchema.pre('save', function (next) {
  if (this.isModified('friends')) this.friendsAmount = this.friends.length;
  next();
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

UserSchema.pre('save', function (next) {
  if (!this.isModified('firstName') || !this.isModified('lastName')) return next();

  this.userName = `${this.firstName} ${this.lastName}`;

  next();
});

UserSchema.methods.checkPassword = async function (candidatePassword, password) {
  return await bcrypt.compare(candidatePassword, password);
};

const User = model('User', UserSchema);

export default User;
