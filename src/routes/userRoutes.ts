import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
    getUserById,
    getUserByEmployeeId,
    updateUser,
    updateUserByEmployeeId,
    resetUserPassword,
    resetUserPasswordByEmployeeId
} from "../controllers/usersController";

export const userRouter = Router();

// Get user by ID (admin only)
userRouter.get("/:id", requireAuth, requireRole(["admin"]), getUserById);

// Get user by employee ID (admin only)
userRouter.get("/employee/:employeeId", requireAuth, requireRole(["admin"]), getUserByEmployeeId);

// Update user by ID (admin only)
userRouter.put("/:id", requireAuth, requireRole(["admin"]), updateUser);

// Update user by employee ID (admin only)
userRouter.put("/employee/:employeeId", requireAuth, requireRole(["admin"]), updateUserByEmployeeId);

// Reset password by user ID (admin only)
userRouter.post("/:id/reset-password", requireAuth, requireRole(["admin"]), resetUserPassword);

// Reset password by employee ID (admin only)
userRouter.post("/employee/:employeeId/reset-password", requireAuth, requireRole(["admin"]), resetUserPasswordByEmployeeId);
