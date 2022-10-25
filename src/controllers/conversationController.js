import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

import { createMessage, excludeDeletionField } from '../utils/controllConversationUtils.js';

export const sendMessage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { id: userId } = req.params;
  const { message } = req.body;

  if (currUser.id === userId)
    return next(new AppError(404, `invalid operation. You can't message yourself`));

  const adressat = await User.findById(userId);

  if (!adressat) return next(new AppError(404, 'adressat user does not exists'));

  const existingConversation = await Conversation.findOne({
    users: { $all: [currUser.id, userId] },
  });

  // create conversation
  if (!existingConversation) {
    const newConversationBody = {
      users: [currUser.id, userId],
    };

    const newConversation = await Conversation.create(newConversationBody);

    await createMessage({ conversation: newConversation._id, author: currUser.id, message });

    await newConversation.populate({ path: 'users', select: 'userName profileImg' });

    await newConversation.populate({ path: 'messages', select: '-deletion' });

    const doc = excludeDeletionField(newConversation._doc);

    return res.status(201).json({ ...doc, messages: newConversation.messages });
  } else if (existingConversation) {
    /**
      if existing conversation is deleted from one of the users and not from both of them, then update deletion reference back to false, because this route is guarantee that this conversation now exists for both of the users
     */
    if (existingConversation.deletion.some((deletion) => deletion.deleted === true)) {
      const i = existingConversation.deletion.findIndex((deletion) => deletion.deleted === true);

      existingConversation.deletion[i] = {
        deletedBy: userId,
        deleted: false,
      };

      await existingConversation.save();
    }

    const newMessage = await createMessage({
      conversation: existingConversation._id,
      author: currUser.id,
      message,
    });

    const doc = excludeDeletionField(newMessage._doc);

    return res.status(201).json(doc);
  }
});

export const getConversation = asyncWrapper(async function (req, res, next) {
  const { id: conversationId } = req.params;
  const currUser = req.user;

  const conversation = await Conversation.findOne({
    conversation: conversationId,
    users: currUser.id,
    deletion: { $elemMatch: { deletedBy: currUser.id, deleted: false } },
  })
    .select('-deletion')
    .populate({
      path: 'users',
      select: 'userName profileImg',
    })
    .populate({
      path: 'messages',
      match: { 'deletion.deletedBy': { $ne: currUser.id } },
      select: '-deletion',
    });

  if (!conversation) return next(new AppError(404, 'conversation does not exists'));

  res.status(200).json(conversation);
});

export const getAllConversation = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, 'you are not authorised for this operation'));

  const conversations = await Conversation.find({
    users: userId,
    deletion: { $elemMatch: { deletedBy: currUser.id, deleted: false } },
  })
    .select('-deletion -__v -updatedAt')
    .sort('-createdAt')
    .populate({
      path: 'users',
      select: 'userName profileImg',
    })
    .populate({
      path: 'messages',
      match: { 'deletion.deletedBy': { $ne: currUser.id } },
      options: { sort: { createdAt: -1 } },
      // match: { deletion: { $elemMatch: { deletedBy: currUser.id, deleted: false } } },
      select: '-deletion -__v -updatedAt',
    });

  res.status(200).json(conversations);
});

export const deleteConversation = asyncWrapper(async function (req, res, next) {
  const { id: conversationId } = req.params;
  const currUser = req.user;

  // 1.1) find conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    users: currUser.id,
  });

  if (!conversation) return next(new AppError(404, 'conversation does not exists'));

  // 1.2) update conversation deletion reference
  const i = conversation.deletion.findIndex((deletion) => deletion.deletedBy === currUser.id);

  conversation.deletion[i] = {
    deletedBy: currUser.id,
    deleted: true,
  };

  await conversation.save();

  // 1.3) update messages deletion reference
  await Message.updateMany(
    {
      conversation: conversationId,
      'deletion.deletedBy': { $ne: currUser.id },
    },
    { $push: { deletion: { deleted: true, deletedBy: currUser.id } } }
  );

  // 1.4) if conversation is deleted by both of the users then clear conversation temporerily
  if (
    conversation.deletion.map((deletion) => deletion.deleted).every((deletion) => deletion === true)
  ) {
    await conversation.delete();
    await Message.deleteMany({ conversation: conversationId });

    return res.status(204).json({ deleted: true });
  } else {
    // 1.4.1) if conversation is deleted only from the one of the user, and not both of them, then delete the messages which ones may was deleted different times by both of the users
    const adressat = conversation.users.filter((user) => user.toString() !== currUser.id)[0];

    await Message.deleteMany({
      conversation: conversationId,
      deletion: {
        $all: [
          { $elemMatch: { deletedBy: adressat, deleted: true } },
          { $elemMatch: { deletedBy: currUser.id, deleted: true } },
        ],
      },
    });
  }

  res.status(204).json({ deleted: true });
});

async function del() {
  await Conversation.deleteMany();
  await Message.deleteMany();
}

async function backToDef() {
  await Conversation.updateMany({ deletion: [] });
  await Message.deleteMany();
}

// backToDef();
// del();
