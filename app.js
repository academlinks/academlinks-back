const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const hpp = require("hpp");
const helmet = require("helmet");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const path = require("path");
const morgan = require("morgan");

const {
  authenticationRoutes,
  postRoutes,
  commentRoutes,
  userRoutes,
  friendsRoutes,
  userInfoRoutes,
  notificationRoutes,
  conversationRoutes,
  adminRoutes,
  commercialRoutes,
} = require("./src/routes");

const { AppError } = require("./src/lib");
const { APP_ORIGINS } = require("./src/config");
const errorController = require("./src/controllers/errorController");
const { Jobs } = require("./src/jobs");

const App = express();

// App.set("view engine", "pug");
// App.set("views", path.join(__dirname, "src/views"));

App.use(express.json());
App.use(express.urlencoded({ extended: true }));
App.use(express.static(path.join(__dirname, "public/images")));

process.env.NODE_MODE === "DEV" && App.use(morgan("dev"));

App.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

App.use(cookieParser());

App.use(mongoSanitize());
App.use(xss());
App.use(hpp());

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

      if (!APP_ORIGINS.includes(origin)) {
        const msg = `This site ${origin} does not have an access. Only specific domains are allowed to access it.`;
        return callback(new Error(msg), false);
      }

      return callback(null, true);
    },
  })
);

new Jobs().sendConfirmationRenewalEmail();

// App.get("/view", (req, res) => {
//   res.status(200).render("emails/wellcome", {
//     userName: "Russ",
//     termsUrl: "http://localhost:3000/terms-and-policy/terms",
//   });
// });

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
