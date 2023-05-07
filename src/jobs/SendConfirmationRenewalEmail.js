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
    try {
      this.schedule.scheduleJob(this.interval.cron, async () => {
        const registrations = await Registration.find({
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
        }).select("+passwordResetToken");

        if (registrations[0])
          registrations.forEach(async (registration) => {
            const resetToken = registration.createPasswordResetToken();

            await new Email({
              adressat: registration.email,
            }).sendRegistrationAprovment({
              userName: registration.firstName,
              url: GENERATE_CONFIRM_REGISTRATION_PASSWORD_RESET_LINK({
                resetToken,
                registrationId: registration.id,
              }),
            });

            registration.confirmationEmailSentAt = new Date();

            await registration.save({ validateBeforeSave: false });
          });
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SendConfirmationRenewalEmail;
