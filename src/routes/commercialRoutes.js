import express from "express";

import { getCommercials } from "../controllers/commercialController.js";

import { checkAuth } from "../controllers/authenticationController.js";

const router = express.Router();

router.route("/").get(checkAuth, getCommercials);

export default router;
