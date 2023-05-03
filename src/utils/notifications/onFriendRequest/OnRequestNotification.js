const Notification = require("../Notification");

class OnRequestNotification extends Notification {
  constructor() {
    super();
  }

  async sendNotificationOnFriendRequest({
    req,
    currUser,
    adressat,
    send,
    confirm,
  }) {
    const io = await this.useLazySocket(req);

    const operations = [];

    const taskBody = {
      from: currUser,
      adressats: [adressat],
      targetType: "user",
    };

    if (send)
      operations.push(
        this.generateTaskBody({
          ...taskBody,
          message: this.NOTIFICATION_PLACEHOLDERS.sendRequest,
          location: adressat,
          options: { isRequested: true },
        })
      );
    else if (confirm)
      operations.push(
        this.generateTaskBody({
          ...taskBody,
          message: this.NOTIFICATION_PLACEHOLDERS.confirmRequest,
          location: currUser,
          options: { isConfirmed: true },
        })
      );

    if (operations[0]) await this.generateNotifications({ operations, io });
  }
}

module.exports = new OnRequestNotification();
