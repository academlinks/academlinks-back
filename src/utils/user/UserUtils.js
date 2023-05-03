const Utils = require("../Utils");
const { AppError } = require("../../lib");

class UserUtils extends Utils {
  checkIfIsFriend({ userId, userFriendShip, currUser }) {
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

    const isRequest = (requests) =>
      requests.some((request) => request.adressat.toString() === userId);

    if (!isFriend && !isCurrUser) {
      const isPendingRequest = isRequest(userFriendShip.pendingRequests);

      if (isPendingRequest) info.isPendingRequest = true;
      else if (!isPendingRequest) {
        const isSentRequest = isRequest(userFriendShip.sentRequests);

        if (isSentRequest) info.isSentRequest = true;
        else if (!isSentRequest) info.isForeign = true;
      }
    }

    return { info, isFriend, isCurrUser };
  }

  checkIfIsFriendOnEach({ currUser, doc, docId, userFriendShip }) {
    if (doc === null) return { restricted: true, _id: docId };

    const userId = doc.author._id.toString();

    const { isFriend, isCurrUser } = this.checkIfIsFriend({
      userId,
      currUser,
      userFriendShip,
    });

    if (!isCurrUser && doc.audience === "private")
      return { restricted: true, _id: docId };
    else if (!isCurrUser && !isFriend && doc.audience === "friends")
      return { restricted: true, _id: docId };
    else return doc;
  }

  async manageUserProfileMedia({ media, fileName, next }) {
    try {
      let mediaUrl;

      await this.unlinkFile({ media });
      if (fileName) mediaUrl = this.generateFileName({ fileName });

      return { mediaUrl };
    } catch (error) {
      return next(
        new AppError(
          406,
          "There was an error during deleting image. Try again later!"
        )
      );
    }
  }
}

module.exports = new UserUtils();
