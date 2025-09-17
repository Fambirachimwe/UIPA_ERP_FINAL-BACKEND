import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getSystemStats, getVehicleStatus, getTeamPendingLeave } from "../controllers/dashboardController";

export const dashboardRouter = Router();

dashboardRouter.get("/system-stats", requireAuth, getSystemStats);
dashboardRouter.get("/vehicle-status", requireAuth, getVehicleStatus);
dashboardRouter.get("/team-pending-leave", requireAuth, getTeamPendingLeave);


