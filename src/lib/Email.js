const pug = require("pug");
const nodemailer = require("nodemailer");
const { SERVER_HOST } = require("../config");

class Email {
  constructor({ adressat, subject, text }) {
    this.user =
      process.env.NODE_MODE === "PROD"
        ? process.env.APP_EMAIL_USER
        : process.env.APP_DEV_EMAIL_USER;
    this.from = `${process.env.APP_NAME} <${this.user}>`;

    this.adressat = adressat;
    this.subject = subject;
    this.text = text;
  }

  transport() {
    const secure = process.env.NODE_MODE === "PROD" ? true : false;
    const host =
      process.env.NODE_MODE === "PROD"
        ? process.env.APP_EMAIL_HOST
        : process.env.APP_DEV_EMAIL_HOST;
    const port =
      process.env.NODE_MODE === "PROD"
        ? process.env.APP_EMAIL_PORT
        : process.env.APP_DEV_EMAIL_PORT;
    const pass =
      process.env.NODE_MODE === "PROD"
        ? process.env.APP_EMAIL_PASSWORD
        : process.env.APP_DEV_EMAIL_PASSWORD;
    const service =
      process.env.NODE_MODE === "PROD"
        ? process.env.APP_EMAIL_SERVICE
        : process.env.APP_DEV_EMAIL_SERVICE;

    return nodemailer.createTransport({
      secure,
      host,
      port,
      service,
      auth: {
        user: this.user,
        pass,
      },
    });
  }

  async send({ text, subject, template, templateParams = null }) {
    try {
      const transportConfig = {
        from: this.from,
        to: this.adressat,
        subject: subject || this.subject,
        text: text || this.text || "",
      };

      if (template) {
        transportConfig.html = pug.renderFile(
          `${__dirname}/../views/emails/${template}.pug`,
          { ...templateParams }
        );
      }

      await this.transport().sendMail(transportConfig);
    } catch (error) {
      throw error;
    }
  }

  async sendWelcome({ userName }) {
    try {
      await this.send({
        subject: "Welcome To Academlinks",
        template: "wellcome",
        templateParams: {
          userName,
          host: SERVER_HOST,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async sendRegistrationAprovment({ url, userName }) {
    try {
      await this.send({
        subject: "Academlinks Registration Aprovment",
        template: "aproveRegistration",
        templateParams: {
          url,
          userName,
          host: SERVER_HOST,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async sendRegistrationReject({ userName, termsUrl }) {
    try {
      await this.send({
        subject: "Academlinks Registration Rejection",
        template: "rejectRegistration",
        templateParams: {
          userName,
          host: SERVER_HOST,
          termsUrl,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async sendPasswordReset({ resetToken, userName }) {
    try {
      await this.send({
        subject: "Academlinks Password Reset",
        template: "passwordReset",
        templateParams: {
          resetToken,
          userName,
          host: SERVER_HOST,
        },
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Email;
