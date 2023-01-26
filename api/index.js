import App from "./app.js";
import { config } from "dotenv";
import mongoose from "mongoose";
import http from "http";
import utils from "util";
import Redis from "ioredis";
import { Server } from "socket.io";
import { getOrigins } from "./src/lib/getOrigins.js";

const { createServer } = http;
const {
  parsed: { PORT, DB_APP_CONNECTION },
} = config();

const redisURL = "redis://127.0.0.1:6379";
const redis = Redis.createClient(redisURL);
redis.set = utils.promisify(redis.set);

const SERVER = createServer(App);

export const io = new Server(SERVER, {
  cors: { origin: getOrigins() },
});

import { socket } from "./io.js";
socket();

App.set("socket", io);
App.set("redis", redis);

process.on("uncaughtException", (err) => {
  console.log("uncaughtException ! process is exited", err);
  process.exit(1);
});

mongoose
  .connect(DB_APP_CONNECTION)
  .then(() => {
    console.log(`DB Is Connected Successfully`);
    SERVER.listen(PORT, () => console.log(`App Listens On Port ${PORT}`));
  })
  .catch((err) => {
    process.on("unhandledRejection", (err) => {
      console.log("Unhandled Rejection, server is closed >", err.message);
      SERVER.close(() => process.exit(1));
    });
  });
