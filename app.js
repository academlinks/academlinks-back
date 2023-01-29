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

App.use(function (req, res, next) {
  console.log(req.headers);
  res.header("Access-Control-Allow-Origin", req.headers.origin);

  const allowedOrigins = getOrigins();
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-credentials", true);
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, UPDATE, OPTIONS"
  );

  next();
});

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
      console.log(getOrigins());
      if (!origin) return callback(null, true);
      if (getOrigins().indexOf(origin) === -1) {
        const msg = `This site ${origin} does not have an access. Only specific domains are allowed to access it.`;
        return callback(new Error(msg), false);
      }

      return callback(null, true);
    },
  })
);

App.get("/", (req, res) => {
  res.status(200).json("wellcome to Academlinks REST API");
});
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

module.exports = App;
