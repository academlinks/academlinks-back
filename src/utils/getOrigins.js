import { config } from "dotenv";

export function getOrigins() {
  const {
    parsed: {
      NODE_MODE,
      ORIGIN_DEV_APP,
      ORIGIN_DEV_ADMIN,
      ORIGIN_PROD_ADMIN,
      ORIGIN_PROD_APP,
    },
  } = config();

  if (NODE_MODE === "DEV") return [ORIGIN_DEV_APP, ORIGIN_DEV_ADMIN];
  else if (NODE_MODE === "PROD") return [ORIGIN_PROD_APP, ORIGIN_PROD_ADMIN];
}
