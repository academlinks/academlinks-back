import fs from "fs";
import { promisify } from "util";

export async function deleteExistingImage(originalFileNameFragments) {
  try {
    const deletion = promisify(fs.unlink);
    await deletion(`public/images/${originalFileNameFragments[0]}`);
  } catch (error) {
    throw new Error(error.message);
  }
}

export function checkIfIsFriend({ user, userId, userFriendShip }) {
  const isFriend = userFriendShip.friends.some(
    (friend) => friend.friend.toString() === userId
  );
  const isCurrUser = user._id.toString() === userId;

  const info = {
    isFriend,
    isPendingRequest: false,
    isSentRequest: false,
    isForeign: false,
  };

  if (!isFriend) {
    const isPendingRequest = userFriendShip.pendingRequests.some(
      (request) => request.adressat.toString() === userId
    );
    if (isPendingRequest) info.isPendingRequest = isPendingRequest;
    else if (!isPendingRequest) {
      const isSentRequest = userFriendShip.sentRequests.some(
        (request) => request.adressat.toString() === userId
      );
      if (isSentRequest) info.isSentRequest = isSentRequest;
      else if (!isSentRequest) info.isForeign = true;
    }
  }

  return { info, isFriend, isCurrUser };
}

export function checkIfIsFriendOnEach({ user, doc, docId, userFriendShip }) {
  if (doc === null) return { restricted: true, _id: docId };

  const authorId = doc.author._id.toString();
  const { isFriend, isCurrUser } = checkIfIsFriend({
    user,
    authorId,
    userFriendShip,
  });

  if (doc.type === "blogPost" && user.role === "user") return doc;
  else if (isCurrUser) return doc;
  else if (!isCurrUser && doc.audience === "private")
    return { restricted: true, _id: doc._id };
  else if (doc.audience === "friends" && !isCurrUser && !isFriend)
    return { restricted: true, _id: doc._id };
  else if (
    (doc.audience === "friends" || doc?.audience === "public") &&
    isFriend
  )
    return doc;
  else return { restricted: true, _id: doc._id };
}
