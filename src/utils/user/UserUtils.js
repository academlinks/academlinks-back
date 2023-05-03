const Utils = require("../Utils");

class UserUtils extends Utils {
  async deleteExistingImage({ media }) {
    try {
      this.unlinkFile({ media });
    } catch (error) {
      throw new Error(error.message);
    }
  }

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
  }

  checkIfIsFriendOnEach({ currUser, doc, docId, userFriendShip }) {
    if (doc === null) return { restricted: true, _id: docId };

    const userId = doc.author._id.toString();

    const { isFriend, isCurrUser } = this.checkIfIsFriend({
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
  }
}

module.exports = new UserUtils();
