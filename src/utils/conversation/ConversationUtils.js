const { User } = require("../../models");
const { AppError } = require("../../lib");

class ConversationUtils {
  async isAvailableConversation({ currUser, adressatId, next }) {
    try {
      if (currUser.id === adressatId)
        return next(
          new AppError(404, `invalid operation. You can't message yourself`)
        );

      const adressat = await User.findById(adressatId);

      if (!adressat) return next(new AppError(404, "user does not exists"));

      return { adressat };
    } catch (error) {
      throw error;
    }
  }

  /**
   * if existing conversation is deleted by one of the users and not from both of them,
   * then update deletion reference back to false,
   * until there is a chance to restore the conversation between these two users
   */
  updateConversationDeletionReference({ conversation, currUser }) {
    const isDeletedConversation = conversation.deletion.some(
      (deletion) => deletion.deleted === true
    );

    const options = {
      isDeletedByCurrUser: false,
    };

    if (!isDeletedConversation) return options;

    const deletionIndex = conversation.deletion.findIndex(
      (deletion) => deletion.deleted === true
    );

    conversation.deletion[deletionIndex] = {
      deletedBy: conversation.deletion[deletionIndex].deletedBy,
      deleted: false,
    };

    options.isDeletedByCurrUser =
      conversation.deletion[deletionIndex].deletedBy !== currUser.id;

    return options;
  }
}

module.exports = new ConversationUtils();
