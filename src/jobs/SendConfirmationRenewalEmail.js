const { Email } = require("../lib");
const { Registration } = require("../models");
const {
  GENERATE_CONFIRM_REGISTRATION_PASSWORD_RESET_LINK,
} = require("../config");

class SendConfirmationRenewalEmail {
  constructor(schedule) {
    this.schedule = schedule;
    this.interval = {
      cron: "0 12 * * *",
      ms: 1000 * 60 * 60 * 24,
    };
  }

  /**
   *  send renewal registration aprovment email to users who is aproved but not confirmed themselves yet - dayly
   */
  async send() {
    this.schedule.scheduleJob(this.interval.cron, async () => {
      const users = await Registration.find({
        aproved: true,
        $or: [
          {
            confirmationEmailSentAt: {
              $lt: new Date(Date.now() - this.interval.ms),
            },
          },
          {
            confirmationEmailSentAt: { $exists: false },
          },
        ],
      });

      if (users[0])
        users.forEach(async (user) => {
          await new Email({ adressat: user.email }).sendRegistrationAprovment({
            userName: user.firstName,
            url: GENERATE_CONFIRM_REGISTRATION_PASSWORD_RESET_LINK({
              registrationId: user.id,
              resetToken: user.passwordResetToken,
            }),
          });

          user.confirmationEmailSentAt = new Date();
          await user.save({ validateBeforeSave: false });
        });
    });
  }
}

module.exports = SendConfirmationRenewalEmail;
