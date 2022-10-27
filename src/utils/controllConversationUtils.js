import Message from '../models/Message.js';

export async function createMessage({ conversation, author, message }) {
  const newMessage = await Message.create({
    conversation,
    author,
    message,
  });

  return newMessage;
}

export function excludeDeletionField(doc) {
  const excludedDoc = {};
  Object.keys(doc)
    .filter((key) => key !== 'deletion')
    .forEach((key) => (excludedDoc[key] = doc[key]));

  return excludedDoc;
}

export async function deleteConversationPermanently({ conversation }) {
  await conversation.delete();
  await Message.deleteMany({ conversation: conversation._id });
}
