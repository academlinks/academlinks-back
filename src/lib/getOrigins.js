const { config } = require("dotenv");

const {
  parsed: {
    NODE_MODE,
    ORIGIN_DEV_APP,
    ORIGIN_DEV_ADMIN,
    ORIGIN_PROD_ADMIN,
    ORIGIN_PROD_APP,
    SERVER_HOST_DEV,
    SERVER_HOST_PROD,
  },
} = config({path:"../../"});

exports.getOrigins = () => {
  if (NODE_MODE === "DEV") return [ORIGIN_DEV_APP, ORIGIN_DEV_ADMIN];
  else if (NODE_MODE === "PROD") return [ORIGIN_PROD_APP, ORIGIN_PROD_ADMIN];
};

exports.getServerHost = () => {
  return NODE_MODE === "DEV"
    ? SERVER_HOST_DEV
    : NODE_MODE === "PROD"
    ? SERVER_HOST_PROD
    : "";
};

exports.getAppHost = () => {
  return NODE_MODE === "DEV"
    ? ORIGIN_DEV_APP
    : NODE_MODE === "PROD"
    ? ORIGIN_PROD_APP
    : "";
};
