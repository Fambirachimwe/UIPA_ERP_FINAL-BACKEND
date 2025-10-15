import express from "express";
import { requireAuth } from "../middleware/auth";
import {
    getQMSDashboard,
    getQMSStatistics,
    searchQMS,
    getUserQMSTasks,
} from "../controllers/qmsController";

const router = express.Router();

// All QMS routes require authentication
router.use(requireAuth);

// QMS Dashboard and Overview
router.get("/dashboard", getQMSDashboard);
router.get("/statistics", getQMSStatistics);
router.get("/search", searchQMS);
router.get("/tasks", getUserQMSTasks);

export default router;
