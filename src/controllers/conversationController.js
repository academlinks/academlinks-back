import AppError from '../lib/AppError.js';
import { asyncWrapper } from '../lib/asyncWrapper.js';

import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

import { createMessage, excludeDeletionField } from '../utils/controllConversationUtils.js';

export const createConversation = asyncWrapper(async function (req, res, next) {
  //   const { id: userId } = req.params;
  //   const currUser = req.user;
  //   const adressat = await User.findById(userId);
  //   if (!adressat) return next(new AppError(404, 'adressat user does not exists'));
  //   else if (currUser === userId)
  //     return next(new AppError(401, `invalid operation. You can't message yourself`));
  //   function excludeDeletionField(doc) {
  //     const excludedDoc = {};
  //     Object.keys(doc)
  //       .filter((key) => key !== 'deletion')
  //       .forEach((key) => (excludedDoc[key] = doc[key]));
  //     return excludedDoc;
  //   }
  //   /////////////////////////////////////////////////////
  //   ////////// if existing conversation exists//////////
  //   ///////////////////////////////////////////////////
  //   const existingConversation = await Conversation.findOne({
  //     users: { $all: [userId, currUser.id] },
  //   })
  //     .populate({ path: 'users', select: 'userName profileImg' })
  //     .populate({ path: 'messages', match: { 'deletion.deletedBy': { $ne: currUser.id } } });
  //   if (existingConversation) {
  //     /**
  //     if existing conversation is deleted from one of the users and not from both of them, then update deletion reference back to false, because this route is guarantee that this conversation is now exists for both of the users
  //     */
  //     if (existingConversation.deletion.some((deletion) => deletion.deletedBy === currUser.id)) {
  //       const i = existingConversation.deletion.findIndex(
  //         (deletion) => deletion.deletedBy === currUser.id
  //       );
  //       existingConversation.deletion[i] = {
  //         ...existingConversation.deletion[i],
  //         deleted: false,
  //         deletedBy: '',
  //       };
  //       await existingConversation.save();
  //     }
  //     const doc = excludeDeletionField(existingConversation._doc);
  //     return res.status(200).json({ ...doc, messages: existingConversation.messages });
  //   }
  ////////////////////////////////////////////////////////////
  ////////// if there are no existing conversation //////////
  //////////////////////////////////////////////////////////
  //   const newConversationBody = {
  //     users: [currUser.id, userId],
  //   };
  //   const newConversation = await Conversation.create(newConversationBody);
  //   newConversation.populate({ path: 'users', select: 'userName profileImg' });
  //   res.status(201).json(newConversation);
});

export const sendMessage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { id: userId } = req.params;
  const { message } = req.body;

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
        deletedBy: currUser.id,
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
    deletion: { $in: [{ 'deletion.deletedBy': currUser.id, 'deletion.deleted': false }] },
    // $and: [{ 'deletion.deletedBy': currUser.id, 'deletion.deleted': false }],
    // 'deletion.deleted': false,
  })
    // .select('-deletion')
    .populate({
      path: 'users',
      select: 'userName profileImg',
    })
    .populate({
      path: 'messages',
      match: { 'deletion.deletedBy': { $ne: currUser.id } },
      select: '-deletion',
    });
  console.log(conversation);
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
    'deletion.deletedBy': currUser.id,
    'deletion.deleted': false,
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

  res.status(200).json(conversations);
});

export const deleteConversation = asyncWrapper(async function (req, res, next) {
  const { id: conversationId } = req.params;
  const currUser = req.user;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    users: currUser.id,
  });

  if (!conversation) return next(new AppError(404, 'conversation does not exists'));

  if (
    conversation.deletion.map((deletion) => deletion.deleted).every((deletion) => deletion === true)
  ) {
    await conversation.delete();
    await Message.deleteMany({ conversation: conversationId });

    return res.status(204).json({ deleted: true });
  } else {
    const adressat = conversation.users.filter((user) => user.toString() !== currUser.id)[0];

    await Message.deleteMany({
      conversation: conversationId,
      $and: [{ 'deletion.deletedBy': adressat }, { 'deletion.deleted': true }],
      $and: [{ 'deletion.deletedBy': currUser.id }, { 'deletion.deleted': true }],
    });
  }

  const i = conversation.deletion.findIndex((deletion) => deletion.deletedBy === currUser.id);
  console.log({ i, x: conversation.deletion[i] });
  conversation.deletion[i] = {
    deletedBy: currUser.id,
    deleted: true,
  };

  await conversation.save();

  await Message.updateMany(
    {
      conversation: conversationId,
      'deletion.deletedBy': { $ne: currUser.id },
    },
    { $push: { deletion: { deleted: true, deletedBy: currUser.id } } }
  );

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
