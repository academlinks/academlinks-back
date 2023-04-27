module.exports = {
  registerUser: require("./registerController").registerUser,
  aproveRegistration: require("./registerController").aproveRegistration,
  deleteRegistrationRequest: require("./registerController")
    .deleteRegistrationRequest,
  checkRegistrationExistance: require("./registerController")
    .checkRegistrationExistance,
  confirmRegistration: require("./registerController").confirmRegistration,

  adminLogIn: require("./loginController").adminLogIn,
  loginUser: require("./loginController").loginUser,
  logoutUser: require("./loginController").logoutUser,
  refresh: require("./loginController").refresh,

  changePassword: require("./passwordAndEmailController").changePassword,
  changeEmail: require("./passwordAndEmailController").changeEmail,
  createResetPasswordForForgotPassword: require("./passwordAndEmailController")
    .createResetPasswordForForgotPassword,
  updateForgotPassword: require("./passwordAndEmailController")
    .updateForgotPassword,
};
