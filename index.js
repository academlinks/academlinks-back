require("dotenv").config();

const App = require("./app");
const mongoose = require("mongoose");

// const Redis = require("ioredis");
const http = require("http");
const { Server } = require("socket.io");

const { APP_ORIGINS, APP_CONNECTION, PORT } = require("./src/config/config");

const { createServer } = http;

const SERVER = createServer(App);

const io = new Server(SERVER, {
  allowEIO3: true,
  cors: { origin: APP_ORIGINS, credentials: true },
});

exports.io = io;
require("./io.js");

App.set("socket", io);

process.on("uncaughtException", (err) => {
  console.log("uncaughtException ! process is exited", err);
  process.exit(1);
});

mongoose.set("strictQuery", false);
mongoose
  .connect(APP_CONNECTION)
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
