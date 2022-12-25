import mongoose from "mongoose";
const { Schema, model } = mongoose;

const RegistrationSchema = new Schema({
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
  birthDate: {
    type: Date,
    required: [true, "please provide us your birthdate"],
  },
  gender: {
    type: String,
    required: [true, "please provide us your gender"],
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
  workplace: {
    type: {
      company: {
        type: String,
        required: [
          true,
          "please tell us where are you working at this point or where you worked last time",
        ],
      },
      position: {
        type: String,
      },
      description: {
        type: String,
      },
      workingYears: {
        type: {
          from: Date,
          to: Date,
        },
      },
    },
  },
});

RegistrationSchema.pre("save", function (next) {
  if (!this.isModified("firstName") || !this.isModified("lastName"))
    return next();

  this.userName = `${this.firstName} ${this.lastName}`;

  next();
});

const Registration = model("Registration", RegistrationSchema);
export default Registration;
