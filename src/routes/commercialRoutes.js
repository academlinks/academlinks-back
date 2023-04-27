const express = require("express");

const { getCommercials } = require("../controllers/commercialController.js");

const router = express.Router();

router.route("/").get(getCommercials);

module.exports = router;
