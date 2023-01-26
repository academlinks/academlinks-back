const Message = require("../models/Message.js");

exports.createMessage = async function ({ conversation, author, message }) {
  const newMessage = await Message.create({
    conversation,
    author,
    message,
  });

  return newMessage;
};

exports.excludeDeletionField = function (doc) {
  const excludedDoc = {};
  Object.keys(doc)
    .filter((key) => key !== "deletion")
    .forEach((key) => (excludedDoc[key] = doc[key]));

  return excludedDoc;
};

exports.deleteConversationPermanently = async function ({ conversation }) {
  await conversation.delete();
  await Message.deleteMany({ conversation: conversation._id });
};
