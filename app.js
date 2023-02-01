const express = require("express");

const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const morgan = require("morgan");

const path = require("path");

const errorController = require("./src/lib/errorController");
const AppError = require("./src/lib/AppError");

const authenticationRoutes = require("./src/routes/authenticationRoutes");
const postRoutes = require("./src/routes/postRoutes");
const commentRoutes = require("./src/routes/commentRoutes");
const userRoutes = require("./src/routes/userRoutes");
const friendsRoutes = require("./src/routes/friendsRoutes");
const userInfoRoutes = require("./src/routes/userInfoRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const conversationRoutes = require("./src/routes/conversationRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const commercialRoutes = require("./src/routes/commercialRoutes");

const { getOrigins } = require("./src/lib/getOrigins");

const App = express();

process.env.NODE_MODE === "DEV" && App.use(morgan("dev"));

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

App.use(function (req, res, next) {
  res.header("Access-Control-Allow-credentials", true);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Origin, Authorization"
  );

  if (req.method === "OPTIONS") res.sendStatus(200);
  else next();
});
App.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (!getOrigins().includes(origin)) {
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

App.get("/wellcome", (req, res) => {
  res.status(200).json("wellcome to Academlinks REST API");
});

App.all("*", (req, res, next) => {
  next(new AppError(404, `can't find ${req.originalUrl} on this server`));
});

App.use(errorController);

module.exports = App;
