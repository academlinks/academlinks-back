const { getAppHost } = require("../lib/getOrigins");

exports.CONFIRM_REGISTRATION_PASSWORD_RESET_LINK = ({
  registrationId,
  resetToken,
}) =>
  `${getAppHost()}/confirmRegistration/${registrationId}/confirm/${resetToken}`;
