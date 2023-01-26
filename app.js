const express = require("express");

const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const morgan = require("morgan");

const path = require("path");
// const { fileURLToPath } = require("url");

const errorController = require("./src/lib/errorController.js");
const AppError = require("./src/lib/AppError.js");

const authenticationRoutes = require("./src/routes/authenticationRoutes.js");
const postRoutes = require("./src/routes/postRoutes.js");
const commentRoutes = require("./src/routes/commentRoutes.js");
const userRoutes = require("./src/routes/userRoutes.js");
const friendsRoutes = require("./src/routes/friendsRoutes.js");
const userInfoRoutes = require("./src/routes/userInfoRoutes.js");
const notificationRoutes = require("./src/routes/notificationRoutes.js");
const conversationRoutes = require("./src/routes/conversationRoutes.js");
const adminRoutes = require("./src/routes/adminRoutes.js");
const commercialRoutes = require("./src/routes/commercialRoutes.js");

const { getOrigins } = require("./src/lib/getOrigins.js");

const App = express();

process.env.NODE_MODE === "DEV" && App.use(morgan("dev"));

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
App.use(express.static(path.join(__dirname, "public/images")));

App.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

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

App.use("/api/v1/administration", adminRoutes);
App.use("/api/v1/authentication", authenticationRoutes);
App.use("/api/v1/posts", postRoutes);
App.use("/api/v1/comments", commentRoutes);
App.use("/api/v1/user", userRoutes, friendsRoutes);
App.use("/api/v1/about", userInfoRoutes);
App.use("/api/v1/notifications", notificationRoutes);
App.use("/api/v1/conversation", conversationRoutes);
App.use("/api/v1/commercials", commercialRoutes);

App.get("/api/v1/home", (req, res) => {
  res.status(200).json({ isEffected: true });
});

App.all("*", (req, res, next) => {
  next(new AppError(404, `can't find ${req.originalUrl} on this server`));
});

App.use(errorController);

module.exports = App;
