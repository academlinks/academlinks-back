const AppError = require("../lib/AppError.js");
const asyncWrapper = require("../lib/asyncWrapper.js");

const Conversation = require("../models/Conversation.js");
const Message = require("../models/Message.js");
const User = require("../models/User.js");
const { useSocket, socket_name_placeholders } = require("../utils/ioUtils.js");

const {
  createMessage,
  excludeDeletionField,
  deleteConversationPermanently,
} = require("../utils/controllConversationUtils.js");

exports.createConvesation = asyncWrapper(async function (req, res, next) {
  const { id: userId } = req.params;
  const currUser = req.user;

  if (userId === currUser.id)
    return next(
      new AppError(403, `invalid operation. You can't write yourself`)
    );

  const conversation = await Conversation.findOne({
    users: { $all: [userId, currUser.id] },
  });

  let isNew = true;

  if (conversation) {
    if (conversation.deletion.some((deletion) => deletion.deleted === true)) {
      const i = conversation.deletion.findIndex(
        (deletion) => deletion.deleted === true
      );

      conversation.deletion[i] = {
        deletedBy: conversation.deletion[i].deletedBy,
        deleted: false,
      };

      if (conversation.deletion[i].deletedBy !== currUser.id) isNew = false;

      await conversation.save();
    }

    return res.status(200).json({ conversationId: conversation._id, isNew });
  }

  const newConversationBody = {
    users: [currUser.id, userId],
  };

  const newConversation = await Conversation.create(newConversationBody);

  res.status(201).json({ conversationId: newConversation._id, isNew });
});

exports.sendMessage = asyncWrapper(async function (req, res, next) {
  const currUser = req.user;
  const { adressatId, conversationId } = req.params;
  const { message } = req.body;

  if (currUser.id === adressatId)
    return next(
      new AppError(404, `invalid operation. You can't message yourself`)
    );

  const adressat = await User.findById(adressatId);

  if (!adressat)
    return next(new AppError(404, "adressat user does not exists"));

  const existingConversation = await Conversation.findById(conversationId);

  /**
      if existing conversation is deleted from one of the users and not from both of them, then update deletion reference back to false, because this route is guarantee that this conversation now exists for both of the users
     */
  if (
    existingConversation.deletion.some((deletion) => deletion.deleted === true)
  ) {
    const i = existingConversation.deletion.findIndex(
      (deletion) => deletion.deleted === true
    );

    existingConversation.deletion[i] = {
      deletedBy: existingConversation.deletion[i].deletedBy,
      deleted: false,
    };
  }

  existingConversation.lastMessage = {
    isRead: false,
    author: currUser.id,
    createdAt: new Date(),
    message,
  };

  const newMessage = await createMessage({
    conversation: existingConversation._id,
    author: currUser.id,
    message,
  });

  await existingConversation.save();

  const doc = excludeDeletionField(newMessage._doc);

  await useSocket(req, {
    adressatId: adressat._id,
    operationName: socket_name_placeholders.receiveNewMessage,
    data: { lastMessage: existingConversation.lastMessage, message: doc },
  });

  res
    .status(201)
    .json({ lastMessage: existingConversation.lastMessage, message: doc });
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

exports.getLastConversation = asyncWrapper(async function (
  req,
  res,
  next
) {
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

  // 1.0) find conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    users: currUser.id,
  });

  if (!conversation)
    return next(new AppError(404, "conversation does not exists"));

  const conversationMessages = await Message.find({
    conversation: conversation._id,
  });

  // 1.1) if conversation is brand new and does not have messages, then delete conversation permanently
  if (conversationMessages.length === 0) {
    deleteConversationPermanently({ conversation });
    return res.status(204).json({ deleted: true });
  }

  // 1.2) update conversation deletion reference for currUser
  const i = conversation.deletion.findIndex(
    (deletion) => deletion.deletedBy === currUser.id
  );

  conversation.deletion[i] = {
    deletedBy: currUser.id,
    deleted: true,
  };

  await conversation.save();

  // 1.3) if conversation is deleted by both of the users then clear conversation permanently
  if (
    conversation.deletion
      .map((deletion) => deletion.deleted)
      .every((deletion) => deletion === true)
  ) {
    deleteConversationPermanently({ conversation });
    return res.status(204).json({ deleted: true });
  }

  // 1.4) if conversation is deleted only from one side then update messages deletion reference for currUser
  await Message.updateMany(
    {
      conversation: conversationId,
      // deletion: { $elemMatch: { deletedBy: { $ne: currUser.id } } },
      "deletion.deletedBy": { $ne: currUser.id },
    },
    { $push: { deletion: { deleted: true, deletedBy: currUser.id } } },
    { new: true }
  );

  // 1.4.1) delete the messages which ones may was deleted different times by both of the users
  const adressat = conversation.users.find(
    (user) => user.toString() !== currUser.id
  );

  await Message.deleteMany({
    conversation: conversationId,
    deletion: {
      $all: [
        { $elemMatch: { deletedBy: adressat, deleted: true } },
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
      new AppError(
        400,
        "adressat is current uuser. please provide valid adressat."
      )
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

  await useSocket(req, {
    operationName: socket_name_placeholders.messageIsRead,
    adressatId,
    data: body,
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

  const count = await Conversation.find({
    users: currUser.id,
    "lastMessage.author": { $ne: currUser.id },
    seen: false,
  }).select("_id");

  res.status(200).json(count);
});

exports.markConversationsAsSeen = asyncWrapper(async function (
  req,
  res,
  next
) {
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

async function del() {
  await Conversation.deleteMany();
  await Message.deleteMany();
}

// del();
