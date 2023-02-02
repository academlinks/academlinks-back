const nodemailer = require("nodemailer");

class Email {
  constructor({ adressat, subject, text }) {
    this.sender = process.env.APP_EMAIL;
    this.pass = process.env.APP_EMAIL_PASSWORD;
    this.appName = process.env.APP_NAME;

    this.adressat = adressat;
    this.subject = subject;
    this.text = text;
  }

  transport() {
    return nodemailer.createTransport({
      service: "gmail",
      secure: false,
      host: "smtp.gmail.com",
      auth: {
        user: this.sender,
        pass: this.pass,
      },
    });
  }

  async send({ text, subject, html }) {
    const transportConfig = {
      from: this.appName,
      to: this.adressat,
      subject: subject || this.subject,
      text: text || this.text,
    };

    if (html) transportConfig.html = html;

    await this.transport().sendMail(transportConfig);
  }

  async sendWelcome() {
    await this.send({
      subject: "WellCome",
      text: "Welcome to Academlinks. Your registration request will be reviewed and we wil Email you in case of affirmation !",
    });
  }

  async sendRegistrationAprovment({ url }) {
    await this.send({
      subject: "Registration Aprovment",
      text: "Your request about registration is aproved",
      html: `<a href="${url}">please click here to confirm registration</a>`,
    });
  }

  async sendRegistrationReject() {
    await this.send({
      subject: "Registration Aprovment",
      text: "Your request about registration is rejected",
    });
  }

  async sendPasswordReset(resetToken) {
    await this.send({
      subject: "Password Reset",
      text: `Your password reset token (valid for only 10 minutes). Password : ${resetToken}`,
    });
  }
}

module.exports = Email;
