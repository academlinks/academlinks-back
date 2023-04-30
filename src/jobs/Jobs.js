const schedule = require("node-schedule");
const SendConfirmationRenewalEmail = require("./SendConfirmationRenewalEmail");

class Jobs {
  constructor() {
    this.ConfirmationRenewalEmail = new SendConfirmationRenewalEmail(schedule);
  }

  /**
   *  send renewal registration aprovment email to users who is aproved but not confirmed themselves yet - dayly
   */
  sendConfirmationRenewalEmail() {
    this.ConfirmationRenewalEmail.send();
  }
}

module.exports = Jobs;
