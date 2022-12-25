import nodemailer from "nodemailer";
import { config } from "dotenv";

export function emailTransport(adressatEmail) {
  const {
    parsed: { APP_EMAIL, APP_EMAIL_PASSWORD },
  } = config();
  
  const companyEmail = APP_EMAIL;
  const emailPassword = APP_EMAIL_PASSWORD;

  const transport = nodemailer.createTransport({
    service: "gmail",
    secure: false,
    host: "smtp.gmail.com",
    auth: {
      user: companyEmail,
      pass: emailPassword,
    },
  });

  const details = {
    from: companyEmail,
    to: adressatEmail,
    subject: "registration aprovment",
    text: "your request about registration is aproved",
  };

  transport.sendMail(details, (err) => {
    if (err) console.log(err);
    else console.log("email is sent");
  });
}
