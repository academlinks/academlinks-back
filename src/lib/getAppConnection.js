const NODE_MODE = process.env.NODE_MODE;
const DB_DEV_APP_CONNECTION = process.env.DB_DEV_APP_CONNECTION;
const DB_APP_CONNECTION = process.env.DB_APP_CONNECTION;

function getAppConnection() {
  if (NODE_MODE === "DEV" || NODE_MODE === "TEST_PROD")
    return DB_DEV_APP_CONNECTION;
  else if (NODE_MODE === "PROD") return DB_APP_CONNECTION;
  else return "";
}

module.exports = getAppConnection;
