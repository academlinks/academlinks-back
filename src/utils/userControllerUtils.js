const fs = require("fs");
const { promisify } = require("util");

exports.deleteExistingImage = async function (originalFileNameFragments) {
  try {
    const deletion = promisify(fs.unlink);
    await deletion(`public/images/${originalFileNameFragments[0]}`);
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.checkIfIsFriend = function ({ userId, userFriendShip, currUser }) {
  const isCurrUser = userId === currUser.id;

  const isFriend =
    currUser.role !== "admin" && !isCurrUser
      ? userFriendShip.friends?.some(
          (friend) => friend.friend.toString() === userId
        )
      : false;

  const info = {
    isFriend,
    isPendingRequest: false,
    isSentRequest: false,
    isForeign: false,
  };

  if (!isFriend && !isCurrUser) {
    const isPendingRequest = userFriendShip.pendingRequests.some(
      (request) => request.adressat.toString() === userId
    );

    if (isPendingRequest) info.isPendingRequest = true;
    else if (!isPendingRequest) {
      const isSentRequest = userFriendShip.sentRequests.some(
        (request) => request.adressat.toString() === userId
      );
      if (isSentRequest) info.isSentRequest = true;
      else if (!isSentRequest) info.isForeign = true;
    }
  }

  return { info, isFriend, isCurrUser };
};

exports.checkIfIsFriendOnEach = function ({
  currUser,
  doc,
  docId,
  userFriendShip,
}) {
  if (doc === null) return { restricted: true, _id: docId };

  const userId = doc.author._id.toString();

  const { isFriend, isCurrUser } = checkIfIsFriend({
    userId,
    userFriendShip,
    currUser,
  });

  if (!isCurrUser && doc.audience === "private") {
    return { restricted: true, _id: docId };
  } else if (!isCurrUser && !isFriend && doc.audience === "friends") {
    return { restricted: true, _id: docId };
  } else {
    return doc;
  }
};
