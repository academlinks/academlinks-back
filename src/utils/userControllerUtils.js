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

export function checkIfIsFriend({ user, userFriendShip, userId }) {
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

  if (!isFriend && !isCurrUser) {
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
    userFriendShip,
    userId: authorId,
  });

  if (!isCurrUser && doc.audience === "private")
    return { restricted: true, _id: docId };
  else if (!isCurrUser && !isFriend && doc.audience === "friends")
    return { restricted: true, _id: docId };
  else return doc;

  // else if (doc.audience === "public") return doc;
  // else if (isCurrUser || isFriend) return doc;
  // else if (doc.type === "blogPost" && user.role === "user") return doc;
  // else if (
  //   (doc.audience === "friends" || doc?.audience === "public") &&
  //   isFriend
  // )
  //   return doc;
}
