const NODE_MODE = process.env.NODE_MODE;

const ORIGIN_DEV_APP = process.env.ORIGIN_DEV_APP;
const ORIGIN_DEV_ADMIN = process.env.ORIGIN_DEV_ADMIN;

const ORIGIN_TEST_PROD_APP = process.env.ORIGIN_TEST_PROD_APP;
const ORIGIN_TEST_PROD_ADMIN = process.env.ORIGIN_TEST_PROD_ADMIN;

const ORIGIN_PROD_ADMIN = process.env.ORIGIN_PROD_ADMIN;
const ORIGIN_PROD_APP = process.env.ORIGIN_PROD_APP;

const SERVER_HOST_DEV = process.env.SERVER_HOST_DEV;
const SERVER_TEST_PROD_HOST = process.env.SERVER_TEST_PROD_HOST;
const SERVER_HOST_PROD = process.env.SERVER_HOST_PROD;

exports.getOrigins = () => {
  if (NODE_MODE === "DEV") return [ORIGIN_DEV_APP, ORIGIN_DEV_ADMIN];
  else if (NODE_MODE === "TEST_PROD")
    return [ORIGIN_TEST_PROD_APP, ORIGIN_TEST_PROD_ADMIN];
  else if (NODE_MODE === "PROD") return [ORIGIN_PROD_APP, ORIGIN_PROD_ADMIN];
  else return [];
};

exports.getServerHost = () => {
  return NODE_MODE === "DEV"
    ? SERVER_HOST_DEV
    : NODE_MODE === "TEST_PROD"
    ? SERVER_TEST_PROD_HOST
    : NODE_MODE === "PROD"
    ? SERVER_HOST_PROD
    : "";
};

/**
 * used for confirm registration route to generatethe application link
 */
exports.getAppHost = () => {
  return NODE_MODE === "DEV"
    ? ORIGIN_DEV_APP
    : NODE_MODE === "TEST_PROD"
    ? ORIGIN_TEST_PROD_APP
    : NODE_MODE === "PROD"
    ? ORIGIN_PROD_APP
    : "";
};
