const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const CommercialSchema = new Schema(
  {
    client: {
      type: String,
      required: [true, "please enter the customer"],
    },

    email: {
      type: String,
    },

    phone: {
      type: String,
    },

    validUntil: {
      type: Date,
      required: [true, "please enter the outdate point"],
    },

    isLinkable: {
      type: Boolean,
      default: false,
    },

    link: {
      type: String,
    },

    media: String,

    location: {
      page: {
        type: String,
        enum: ["feed", "blogPost"],
      },
      side: {
        type: String,
        enum: ["left", "right"],
      },
    },
  },
  { timestamps: true }
);

const Commercial = model("Commercial", CommercialSchema);

module.exports = Commercial;
