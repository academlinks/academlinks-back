const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { getServerHost } = require("../lib/getOrigins");

const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user"],
      require: true,
      default: "user",
    },

    firstName: {
      type: String,
      require: [true, "please provide us your first name"],
    },

    lastName: {
      type: String,
      require: [true, "please provide us your last name"],
    },

    userName: {
      type: String,
    },

    email: {
      type: String,
      unique: true,
      require: [true, "please provide us your email"],
    },

    birthDate: {
      type: Date,
    },

    age: {
      type: Number,
    },

    from: {
      country: {
        type: String,
        required: [true, "please provide us the country where are you from"],
      },
      city: {
        type: String,
        required: [true, "please provide us the city where are you from"],
      },
    },

    currentLivingPlace: {
      country: {
        type: String,
        required: [true, "please provide us the country where are you from"],
      },
      city: {
        type: String,
        required: [true, "please provide us the city where are you from"],
      },
    },

    currentWorkplace: {
      institution: {
        type: String,
        required: [true, "please provide us where are you work"],
      },
      position: {
        type: String,
        enum: [
          "professor",
          "associate professor",
          "assistant professor",
          "researcher",
          "administrative personnel",
          "phd student",
          "post-doc-fellow",
        ],
        required: [true, "please provide us your position"],
      },
      description: String,
    },

    workplace: [
      {
        institution: {
          type: String,
          required: [true, "please provide us where are you work"],
        },
        position: {
          type: String,
          required: [true, "please provide us your position"],
        },
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
        faculty: {
          type: String,
          required: [true, "please provide us the faculty"],
        },
        degree: {
          type: String,
          enum: ["bachelor", "master", "doctor"],
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
      enum: ["male", "female"],
      required: true,
    },

    profileImg: {
      type: String,
    },

    coverImg: {
      type: String,
      default: "http://localhost:4000/avatars/cover-default.webp",
    },

    password: {
      type: String,
      require: true,
      select: false,
    },

    resetPassword: {
      type: String,
      select: false,
    },

    resetPasswordExpiresIn: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

UserSchema.index({ userName: 1 });

UserSchema.pre("save", function (next) {
  if (!this.isNew) return next();
  const maleAvatar = "/avatars/avatar-male.webp";
  const femaleAvatar = "/avatars/avatar-female.webp";

  if (this.gender === "male") {
    this.profileImg = getServerHost().concat(maleAvatar);
  } else if (this.gender === "female") {
    this.profileImg = getServerHost().concat(femaleAvatar);
  }

  next();
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("birthDate")) return next();

  const date = new Date(this.birthDate);

  function calcAge() {
    return Math.abs(new Date(Date.now() - date.getTime()).getFullYear() - 1970);
  }

  this.age = calcAge();

  next();
});

UserSchema.methods.checkPassword = async function (
  candidatePassword,
  password
) {
  return await bcrypt.compare(candidatePassword, password);
};

UserSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetPassword = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpiresIn = Date.now() + 1000 * 60 * 10;

  return resetToken;
};

const User = model("User", UserSchema);

module.exports = User;
