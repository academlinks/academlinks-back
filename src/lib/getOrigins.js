const NODE_MODE = process.env.NODE_MODE;
const ORIGIN_DEV_APP = process.env.ORIGIN_DEV_APP;
const ORIGIN_DEV_ADMIN = process.env.ORIGIN_DEV_ADMIN;
const ORIGIN_PROD_ADMIN = process.env.ORIGIN_PROD_ADMIN;
const ORIGIN_PROD_APP = process.env.ORIGIN_PROD_APP;
const SERVER_HOST_DEV = process.env.SERVER_HOST_DEV;
const SERVER_HOST_PROD = process.env.SERVER_HOST_PROD;

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
