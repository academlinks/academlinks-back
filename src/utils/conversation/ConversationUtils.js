const { Message } = require("../../models");

class ConversationUtils {
  async createMessage({ conversation, author, message }) {
    try {
      const newMessage = await Message.create({
        conversation,
        author,
        message,
      });

      return newMessage;
    } catch (error) {
      throw error;
    }
  }

  async deleteConversationPermanently({ conversation }) {
    try {
      await Message.deleteMany({ conversation: conversation._id });
      await conversation.delete();
    } catch (error) {
      throw error;
    }
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
