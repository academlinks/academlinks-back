const {
  CLIENT_TERMS_URL,
  GENERATE_CONFIRM_REGISTRATION_PASSWORD_RESET_LINK,
} = require("../../config/config");
const { Email } = require("../../lib");

class EmailUtils {
  async sendManualEmail({ adressat, subject, text }) {
    try {
      await new Email({ adressat, subject, text }).send({});
    } catch (error) {
      throw new Error(
        "There was an error during sending the email. Try again later!"
      );
    }
  }

  async sendPasswordResetEmail({ adressat, resetToken, userName }) {
    try {
      await new Email({ adressat }).sendPasswordReset({ userName, resetToken });
    } catch (error) {
      throw new Error(
        "There was an error during sending the password reset email. Try again later!"
      );
    }
  }

  async sendWelcomeEmail({ adressat, userName }) {
    try {
      await new Email({ adressat }).sendWelcome({ userName });
    } catch (error) {
      throw new Error(
        "There was an error during sending the welcome email. Try again later!"
      );
    }
  }

  async sendAproveRegistrationEmail({
    adressat,
    userName,
    registrationId,
    resetToken,
  }) {
    try {
      await new Email({ adressat }).sendRegistrationAprovment({
        userName,
        url: GENERATE_CONFIRM_REGISTRATION_PASSWORD_RESET_LINK({
          registrationId,
          resetToken,
        }),
      });
    } catch (error) {
      throw new Error(
        "There was an error during sending the aprove registration email. Try again later!"
      );
    }
  }

  async sendRejectRegistrationEmail({ adressat, userName }) {
    try {
      await new Email({ adressat }).sendRegistrationReject({
        userName,
        termsUrl: CLIENT_TERMS_URL,
      });
    } catch (error) {
      throw new Error(
        "There was an error during sending the reject registration email. Try again later!"
      );
    }
  }
}

module.exports = new EmailUtils();
