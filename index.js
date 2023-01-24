import { config } from "dotenv";
import mongoose from "mongoose";
import App from "./app.js";
import http from "http";
import { Server } from "socket.io";
import { getOrigins } from "./src/lib/getOrigins.js";

const { createServer } = http;
const {
  parsed: { PORT, DB_APP_CONNECTION },
} = config();

const SERVER = createServer(App);

export const io = new Server(SERVER, {
  cors: { origin: getOrigins() },
});

import { socket } from "./io.js";
socket();

App.set("socket", io);

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
