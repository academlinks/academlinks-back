const express = require("express");

const { getCommercials } = require("../controllers/commercialController.js");

const { checkAuth } = require("../controllers/authenticationController.js");

const router = express.Router();

router.route("/").get(checkAuth, getCommercials);

module.exports = router;
