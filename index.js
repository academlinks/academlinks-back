require("dotenv").config();

const App = require("./app");
const mongoose = require("mongoose");
// const utils = require("util");
// const Redis = require("ioredis");
const http = require("http");
const { Server } = require("socket.io");
const { getOrigins } = require("./src/lib/getOrigins");
const getAppConnection = require("./src/lib/getAppConnection");

const { createServer } = http;

const PORT = process.env.PORT;

// const redisURL = "redis://127.0.0.1:6379";
// const redis = Redis.createClient(redisURL);
// redis.set = utils.promisify(redis.set);

const SERVER = createServer(App);

const io = new Server(SERVER, {
  allowEIO3: true,
  cors: { origin: getOrigins(), credentials: true },
});

exports.io = io;
require("./io.js");

App.set("socket", io);
// App.set("redis", redis);

process.on("uncaughtException", (err) => {
  console.log("uncaughtException ! process is exited", err);
  process.exit(1);
});

mongoose.set("strictQuery", false);
mongoose
  .connect(getAppConnection())
  .then(() => {
    console.log(`DB Is Connected Successfully`);
    SERVER.listen(PORT, () => {
      console.log(`App Listens On Port ${PORT}`);
    });
  })
  .catch((err) => {
    process.on("unhandledRejection", (err) => {
      console.log("Unhandled Rejection, server is closed >", err.message);
      SERVER.close(() => process.exit(1));
    });
  });
