module.exports = {
  getRegistrationLabels: require("./userRegistrationController")
    .getRegistrationLabels,
  getRegistration: require("./userRegistrationController").getRegistration,

  getUserLabels: require("./usersController").getUserLabels,
  getUserInfo: require("./usersController").getUserInfo,
  getUsersForStatistic: require("./usersController").getUsersForStatistic,

  resizeAndOptimiseMedia: require("./commercialsController")
    .resizeAndOptimiseMedia,
  uploadCommercialMediaFiles: require("./commercialsController")
    .uploadCommercialMediaFiles,
  getCommercials: require("./commercialsController").getCommercials,
  getCommercial: require("./commercialsController").getCommercial,
  addCommercial: require("./commercialsController").addCommercial,
  deleteCommercial: require("./commercialsController").deleteCommercial,
  updateCommercial: require("./commercialsController").updateCommercial,
  sendEmailToCommercialCustomer: require("./commercialsController")
    .sendEmailToCommercialCustomer,

  getBadges: require("./notificationsController").getBadges,
  getNotifications: require("./notificationsController").getNotifications,
  getNotification: require("./notificationsController").getNotification,
  deleteAllNotifications: require("./notificationsController")
    .deleteAllNotifications,
  deleteNotification: require("./notificationsController").deleteNotification,
  markNotificationsAsSeen: require("./notificationsController")
    .markNotificationsAsSeen,
  markNotificationAsRead: require("./notificationsController")
    .markNotificationAsRead,
};
