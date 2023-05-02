const { Message } = require("../../models");

class ConversationUtils {
  async createMessage({ conversation, author, message }) {
    const newMessage = await Message.create({
      conversation,
      author,
      message,
    });

    return newMessage;
  }

  async deleteConversationPermanently({ conversation }) {
    await Message.deleteMany({ conversation: conversation._id });
    await conversation.delete();
  }

  excludeDeletionField(doc) {
    const excludedDoc = {};
    Object.keys(doc)
      .filter((key) => key !== "deletion")
      .forEach((key) => (excludedDoc[key] = doc[key]));

    return excludedDoc;
  }
}

module.exports = new ConversationUtils();
