const App = require("./app.js");
const mongoose = require("mongoose");
const utils = require("util");
const Redis = require("ioredis");
const SERVER = require("http").Server(App);
const { Server } = require("socket.io");
const { getOrigins } = require("./src/lib/getOrigins.js");
require("dotenv").config();

// const { createServer } = http;

const PORT = process.env.PORT;
const DB_APP_CONNECTION = process.env.DB_APP_CONNECTION;

const redisURL = "redis://127.0.0.1:6379";
const redis = Redis.createClient(redisURL);
redis.set = utils.promisify(redis.set);

// const SERVER = createServer(App);

const io = new Server(SERVER, {
  cors: { origin: getOrigins() },
});

module.exports = io;

const { socket } = require("./io.js");

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
    SERVER.listen(PORT, () => {
      socket();
      console.log(`App Listens On Port ${PORT}`);
    });
  })
  .catch((err) => {
    process.on("unhandledRejection", (err) => {
      console.log("Unhandled Rejection, server is closed >", err.message);
      SERVER.close(() => process.exit(1));
    });
  });
