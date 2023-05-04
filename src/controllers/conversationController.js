const { Conversation, Message } = require("../models");
const { AppError, asyncWrapper, IO } = require("../lib");
const { ConversationUtils } = require("../utils/conversation");

exports.createConvesation = asyncWrapper(async function (req, res, next) {
  const { id: userId } = req.params;
  const currUser = req.user;

  await ConversationUtils.isAvailableConversation({
    next,
    currUser,
    adressatId: userId,
  });

  const conversation = await Conversation.findOne({
    users: { $all: [userId, currUser.id] },
  });

  let isNew = true;
  console.log("runs create conversation");
  if (conversation) {
    const { isDeletedByCurrUser } =
      ConversationUtils.updateConversationDeletionReference({
        currUser,
        conversation,
      });

    if (!isDeletedByCurrUser) isNew = false;
    console.log({ conversationDeletion: conversation.deletion });
    await conversation.save();

    return res.status(200).json({ conversationId: conversation._id, isNew });
  }

  const newConversationBody = { users: [currUser.id, userId] };

  const newConversation = await Conversation.create(newConversationBody);

  res.status(201).json({ conversationId: newConversation._id, isNew });
});

exports.sendMessage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { message } = req.body;
  const { adressatId, conversationId } = req.params;

  const { adressat } = await ConversationUtils.isAvailableConversation({
    next,
    currUser,
    adressatId,
  });

  const conversation = await Conversation.findById(conversationId);

  if (!conversation)
    return next(new AppError(404, "Conversation doesn't exists"));

  ConversationUtils.updateConversationDeletionReference({
    currUser,
    conversation,
  });

  conversation.lastMessage = {
    message,
    isRead: false,
    author: currUser.id,
    createdAt: new Date(),
  };

  await conversation.save();

  const newMessage = await Message.create({
    message,
    author: currUser.id,
    conversation: conversation._id,
  });

  newMessage.deletion = undefined;

  await IO.useSocket(req, {
    adressatId: adressat._id,
    operationName: IO.IO_PLACEHOLDERS.receive_new_message,
    data: { lastMessage: conversation.lastMessage, message: newMessage },
  });

  res
    .status(201)
    .json({ lastMessage: conversation.lastMessage, message: newMessage });
});

exports.getConversation = asyncWrapper(async function (req, res, next) {
  const { id: conversationId } = req.params;
  const currUser = req.user;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    users: currUser.id,
    deletion: { $elemMatch: { deletedBy: currUser.id, deleted: false } },
  })
    .select("-deletion")
    .populate({
      path: "users",
      select: "userName profileImg",
    })
    .populate({
      path: "messages",
      match: { "deletion.deletedBy": { $ne: currUser.id } },
      select: "-deletion",
    });

  if (!conversation)
    return next(new AppError(404, "conversation does not exists"));

  res.status(200).json(conversation);
});

exports.getLastConversation = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for this operation"));

  const lastConversation = await Conversation.findOne({
    users: userId,
    deletion: { $elemMatch: { deletedBy: currUser.id, deleted: false } },
  })
    .sort("updatedAt")
    .select("-deletion -__v -updatedAt")
    .limit(1)
    .populate({
      path: "users",
      select: "userName profileImg",
    })
    .populate({
      path: "messages",
      match: { "deletion.deletedBy": { $ne: currUser.id } },
      options: { sort: { createdAt: 1 } },
      // match: { deletion: { $elemMatch: { deletedBy: currUser.id, deleted: false } } },
      select: "-deletion -__v -updatedAt",
    });

  res.status(200).json(lastConversation);
});

exports.getAllConversation = asyncWrapper(async function (req, res, next) {
  const { userId } = req.params;
  const currUser = req.user;

  if (userId !== currUser.id)
    return next(new AppError(403, "you are not authorised for this operation"));

  const conversations = await Conversation.find({
    users: userId,
    deletion: { $elemMatch: { deletedBy: currUser.id, deleted: false } },
  })
    .select("-deletion -__v")
    .sort("-createdAt")
    .populate({
      path: "users",
      select: "userName profileImg",
    })
    .populate({
      path: "messages",
      match: { "deletion.deletedBy": { $ne: currUser.id } },
      options: { sort: { createdAt: 1 } },
      // match: { deletion: { $elemMatch: { deletedBy: currUser.id, deleted: false } } },
      select: "-deletion -__v -updatedAt",
    });

  res.status(200).json(conversations);
});

exports.deleteConversation = asyncWrapper(async function (req, res, next) {
  const { id: conversationId } = req.params;
  const currUser = req.user;

  // 1.0) find conversation and messages

  const conversation = await Conversation.findOne({
    _id: conversationId,
    users: currUser.id,
  });

  if (!conversation)
    return next(new AppError(404, "conversation does not exists"));

  const conversationMessages = await Message.find({
    conversation: conversationId,
  });

  // 2.0) update conversation deletion reference for currUser

  const deletionIndex = conversation.deletion.findIndex(
    (deletion) => deletion.deletedBy === currUser.id
  );

  conversation.deletion[deletionIndex] = {
    deletedBy: currUser.id,
    deleted: true,
  };

  // 3.0) if conversation is brand new and does not have messages,
  //      or it is already deleted by adressat,
  //      then delete conversation permanently

  const deleteConversationPermanently =
    conversation.deletion
      .map((deletion) => deletion.deleted)
      .every((deletion) => deletion === true) ||
    conversationMessages.length === 0;

  if (deleteConversationPermanently) {
    await Message.deleteMany({ conversation: conversation._id });
    await conversation.delete();

    return res.status(204).json({ deleted: true });
  }

  await conversation.save();

  // 4.0) if conversation is deleted only from one of the users
  //      then update messages deletion reference for currUser
  await Message.updateMany(
    {
      conversation: conversationId,
      "deletion.deletedBy": { $ne: currUser.id },
    },
    { $push: { deletion: { deleted: true, deletedBy: currUser.id } } },
    { new: true }
  );

  // 5.0) delete the messages which ones may was deleted different times by both of the users
  const adressatId = conversation.users.find(
    (user) => user.toString() !== currUser.id
  );

  await Message.deleteMany({
    conversation: conversationId,
    deletion: {
      $all: [
        { $elemMatch: { deletedBy: adressatId, deleted: true } },
        { $elemMatch: { deletedBy: currUser.id, deleted: true } },
      ],
    },
  });

  res.status(204).json({ deleted: true });
});

exports.markAsRead = asyncWrapper(async function (req, res, next) {
  const { conversationId, adressatId } = req.params;
  const currUser = req.user;

  if (currUser.id === adressatId)
    return next(
      new AppError(400, "invalid operation. You can't message yourself.")
    );

  const updatedConversation = await Conversation.findByIdAndUpdate(
    conversationId,
    {
      "lastMessage.isRead": true,
    },
    { new: true }
  );

  const body = {
    conversationId,
    body: updatedConversation.lastMessage,
  };

  await IO.useSocket(req, {
    data: body,
    adressatId,
    operationName: IO.IO_PLACEHOLDERS.message_is_read,
  });

  res.status(200).json(body);
});

exports.getUnseenConversationCount = asyncWrapper(async function (
  req,
  res,
  next
) {
  const currUser = req.user;
  const { userId } = req.params;

  if (currUser.id !== userId)
    return next(new AppError(403, "you are not authorized for this operation"));

  const conversations = await Conversation.find({
    users: currUser.id,
    "lastMessage.author": { $ne: currUser.id },
    "lastMessage.isRead": false,
  }).select("_id");

  res.status(200).json(conversations);
});

exports.markConversationsAsSeen = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { userId } = req.params;

  if (currUser.id !== userId)
    return next(new AppError(403, "you are not authorized for this operation"));

  await Conversation.updateMany(
    {
      users: currUser.id,
      "lastMessage.author": { $ne: currUser.id },
      seen: false,
    },
    { $set: { seen: true } }
  );

  res.status(200).json({ isMarked: true });
});
