import fs from "fs";
import { promisify } from "util";
import Friendship from "../models/Friendship.js";

export async function deleteExistingImage(originalFileNameFragments) {
  try {
    const deletion = promisify(fs.unlink);
    await deletion(`public/images/${originalFileNameFragments[0]}`);
  } catch (error) {
    throw new Error(error.message);
  }
}

export function checkIfIsFriend({ userId, userFriendShip, currUser }) {
  const isCurrUser = userId === currUser.id;

  const isFriend =
    currUser.role !== "admin" || !isCurrUser
      ? userFriendShip.friends?.some(
          (friend) => friend.friend.toString() === currUser.id
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
      (request) => request.adressat.toString() === currUser.id
    );
    if (isPendingRequest) info.isPendingRequest = true;
    else if (!isPendingRequest) {
      const isSentRequest = userFriendShip.sentRequests.some(
        (request) => request.adressat.toString() === currUser.id
      );
      if (isSentRequest) info.isSentRequest = true;
      else if (!isSentRequest) info.isForeign = true;
    }
  }

  return { info, isFriend, isCurrUser };
}

export function checkIfIsFriendOnEach({ currUser, doc, docId }) {
  if (doc === null) return { restricted: true, _id: docId };

  const userId = doc.author._id.toString();
  const userFriendShip = Friendship.find({ user: userId }).then((data) => data);

  const { isFriend, isCurrUser } = checkIfIsFriend({
    userId,
    userFriendShip,
    currUser,
  });

  if (!isCurrUser && doc.audience === "private")
    return { restricted: true, _id: docId };
  else if (!isCurrUser && !isFriend && doc.audience === "friends")
    return { restricted: true, _id: docId };
  else return doc;
}
