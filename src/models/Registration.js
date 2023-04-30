const mongoose = require("mongoose");
const crypto = require("crypto");
const { Schema, model } = mongoose;

const RegistrationSchema = new Schema(
  {
    email: {
      type: String,
      unique: true,
      required: [true, "please provide us your email"],
    },

    firstName: {
      type: String,
      required: [true, "please provide us your firstname"],
    },

    lastName: {
      type: String,
      required: [true, "please provide us your lastname"],
    },

    userName: {
      type: String,
    },

    gender: {
      type: String,
      required: [true, "please provide us your gender"],
    },

    birthDate: {
      type: Date,
      required: [true, "please provide us your birthdate"],
    },

    currentLivingPlace: {
      type: {
        city: {
          type: String,
          required: [true, "please enter the city where you are at this point"],
        },
        country: {
          type: String,
          required: [
            true,
            "please enter the country where you are at this point",
          ],
        },
      },
    },

    from: {
      type: {
        city: {
          type: String,
          required: [true, "please enter the city whre are you from"],
        },
        country: {
          type: String,
          required: [true, "please enter the country where are you from"],
        },
      },
    },

    registrationBio: {
      type: {
        institution: {
          type: String,
          required: [
            true,
            "please tell us where are you working at this point.",
          ],
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
        },
        description: {
          type: String,
        },
      },
    },

    terms: {
      type: String,
      enum: ["on"],
      required: [
        true,
        "Please accept to all the terms and conditions before sending registration request.",
      ],
    },

    aproved: {
      type: Boolean,
      default: false,
    },

    passwordResetToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

RegistrationSchema.pre("save", function (next) {
  if (!this.isModified("firstName") || !this.isModified("lastName"))
    return next();

  this.userName = `${this.firstName} ${this.lastName}`;

  next();
});

RegistrationSchema.methods.createPasswordResetToken = function () {
  const passwordReset = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(passwordReset)
    .digest("hex");

  return passwordReset;
};

const Registration = model("Registration", RegistrationSchema);
module.exports = Registration;
