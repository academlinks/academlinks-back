////////////////////////////////////////
///////////////// ENVS ////////////////
//////////////////////////////////////

const NODE_MODE = process.env.NODE_MODE;

const ORIGIN_DEV_APP = process.env.ORIGIN_DEV_APP;
const ORIGIN_DEV_ADMIN = process.env.ORIGIN_DEV_ADMIN;

const ORIGIN_PROD_ADMIN = process.env.ORIGIN_PROD_ADMIN;
const ORIGIN_PROD_APP = process.env.ORIGIN_PROD_APP;

const SERVER_HOST_DEV = process.env.SERVER_HOST_DEV;
const SERVER_HOST_PROD = process.env.SERVER_HOST_PROD;

const DB_APP_CONNECTION = process.env.DB_APP_CONNECTION;
const DB_DEV_APP_CONNECTION = process.env.DB_DEV_APP_CONNECTION;

const PORT = process.env.PORT;

////////////////////////////////////////
///////////////// VARS ////////////////
//////////////////////////////////////

// DB
const APP_CONNECTION =
  NODE_MODE === "DEV" ? DB_DEV_APP_CONNECTION : DB_APP_CONNECTION;

// HOSTS & ORIGINS
const CLIENT_HOST = NODE_MODE === "DEV" ? ORIGIN_DEV_APP : ORIGIN_PROD_APP;
const ADMIN_HOST = NODE_MODE === "DEV" ? ORIGIN_DEV_ADMIN : ORIGIN_PROD_ADMIN;
const SERVER_HOST = NODE_MODE === "DEV" ? SERVER_HOST_DEV : SERVER_HOST_PROD;

const APP_ORIGINS =
  NODE_MODE === "DEV"
    ? [ORIGIN_DEV_APP, ORIGIN_DEV_ADMIN]
    : [ORIGIN_PROD_APP, ORIGIN_PROD_ADMIN];

// SOCKET
const IO_PLACEHOLDERS = {
  // FOR BOTH
  connection: "connection",
  disconnect: "disconnect",
  userConnection: "user_connection",
  userDisconnection: "user_disconnection",
  // FOR ADMIN
  newUserIsRegistered: "new_user_is_registered",
  userChangeEmail: "admin_change_email_notify",
  // FOR USERS
  receiveNewFriendRequest: "receive_new_friend_request",
  receiveNewNotification: "receive_new_notification",
  receiveNewMessage: "receive_new_message",
  messageIsRead: "receive_message_isRead",
};

// UPLOADS AND STATIC DESTINATIONS
const CLIENT_UPLOAD_DESTINATION = "public/images/uploads";
const CLIENT_STATIC_URL_ROOT = `${SERVER_HOST}/uploads`;
const COMMERCIAL_UPLOAD_DESTINATION = "public/images/commercials";
const COMMERCIAL_STATIC_URL_ROOT = `${SERVER_HOST}/commercials`;

// CLIENT URLS
const GENERATE_CONFIRM_REGISTRATION_PASSWORD_RESET_LINK = ({
  registrationId,
  resetToken,
}) =>
  `${CLIENT_HOST}/confirmRegistration/${registrationId}/confirm/${resetToken}`;

const CLIENT_TERMS_URL = `${CLIENT_HOST}/terms-and-policy/terms`;

//NOTIFICATIONS
const NOTIFICATION_PLACEHOLDERS = {
  // On Comments
  onCommentToPostAuthor: (postType) => `commented on your ${postType}`,
  onCommentToPostAuthorMentioned: (postType) =>
    `you're mentioned in the comment on your ${postType}`,
  onCommentToUserAreTagedOnPostAndOnCommentTo: (postType) =>
    `you're mentioned in the comment on ${"PostAuthorPlaceholder"}'s ${postType} on which you are tagged in`,
  onCommentToUserAreTagedOnPost: (postType) =>
    `commented on ${"PostAuthorPlaceholder"}'s ${postType} on which you are tagged in`,
  onCommentReplyToUserAreTagedOnPostAndOnCommentTo: (postType) =>
    `replied on your comment on the ${"PostAuthorPlaceholder"}'s ${postType} on which you are tagged in`,
  onCommentUsersAreTaggedOnComment: (postType) =>
    `you're mentioned in the comment on ${"PostAuthorPlaceholder"}'s ${postType}`,
  onCommentAuthor: (postType) =>
    `replied on your comment on ${"PostAuthorPlaceholder"}'s ${postType}`,
  // Friend Requests
  sendRequest: `sent you friend request`,
  confirmRequest: `confirmed your friend request`,
  // Post
  onPostTag: (postType) => `mentioned you in the ${postType}`,
  onPostShareAndTagAuthor: (postType) =>
    `share your ${postType} and mentioned you in the post`,
  onPostShare: (postType) => `share your ${postType}`,
};

module.exports = {
  PORT,
  APP_CONNECTION,
  CLIENT_HOST,
  ADMIN_HOST,
  SERVER_HOST,
  APP_ORIGINS,
  IO_PLACEHOLDERS,
  CLIENT_TERMS_URL,
  NOTIFICATION_PLACEHOLDERS,
  CLIENT_UPLOAD_DESTINATION,
  CLIENT_STATIC_URL_ROOT,
  COMMERCIAL_UPLOAD_DESTINATION,
  COMMERCIAL_STATIC_URL_ROOT,
  GENERATE_CONFIRM_REGISTRATION_PASSWORD_RESET_LINK,
};
