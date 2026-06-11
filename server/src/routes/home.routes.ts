import express from "express";
import { getHomeStats } from "../controllers/home.controller";

const router = express.Router();

router.get("/", getHomeStats);

export default router;