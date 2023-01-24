import express from "express";

import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import morgan from "morgan";

import path from "path";
import { fileURLToPath } from "url";

import { errorController } from "./src/lib/errorController.js";
import AppError from "./src/lib/AppError.js";

import authenticationRoutes from "./src/routes/authenticationRoutes.js";
import postRoutes from "./src/routes/postRoutes.js";
import commentRoutes from "./src/routes/commentRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import friendsRoutes from "./src/routes/friendsRoutes.js";
import userInfoRoutes from "./src/routes/userInfoRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import conversationRoutes from "./src/routes/conversationRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import commercialRoutes from "./src/routes/commercialRoutes.js";

import { getOrigins } from "./src/lib/getOrigins.js";

const App = express();

process.env.NODE_MODE === "DEV" && App.use(morgan("dev"));
App.use(helmet());
App.use(express.json());
App.use(express.urlencoded({ extended: false }));

App.use(mongoSanitize());
App.use(xss());
App.use(hpp());

App.use(cookieParser());
App.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (getOrigins().indexOf(origin) === -1) {
        const msg = `This site ${origin} does not have an access. Only specific domains are allowed to access it.`;
        return callback(new Error(msg), false);
      }

      return callback(null, true);
    },
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
App.use(express.static(path.join(__dirname, "public/images")));

App.use("/api/v1/administration", adminRoutes);
App.use("/api/v1/authentication", authenticationRoutes);
App.use("/api/v1/posts", postRoutes);
App.use("/api/v1/comments", commentRoutes);
App.use("/api/v1/user", userRoutes, friendsRoutes);
App.use("/api/v1/about", userInfoRoutes);
App.use("/api/v1/notifications", notificationRoutes);
App.use("/api/v1/conversation", conversationRoutes);
App.use("/api/v1/commercials", commercialRoutes);

App.all("*", (req, res, next) => {
  next(new AppError(404, `can't find ${req.originalUrl} on this server`));
});

App.use(errorController);

export default App;
