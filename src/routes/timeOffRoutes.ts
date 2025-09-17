import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

// Leave Types
import {
    listLeaveTypes,
    getLeaveType,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType
} from "../controllers/leaveTypesController";

// Leave Balances
import {
    getMyBalances,
    getEmployeeBalances,
    allocateBalance,
    bulkAllocateBalances,
} from "../controllers/leaveBalancesController";

// Leave Requests
import {
    listLeaveRequests,
    getLeaveRequest,
    createLeaveRequest,
    updateLeaveRequest,
    cancelLeaveRequest,
    approveLeaveRequest,
} from "../controllers/leaveRequestsController";

export const timeOffRouter = Router();

// Leave Types Routes
timeOffRouter.get("/leave-types", requireAuth, listLeaveTypes);
timeOffRouter.get("/leave-types/:id", requireAuth, getLeaveType);
timeOffRouter.post("/leave-types", requireAuth, requireRole(["admin"]), createLeaveType);
timeOffRouter.put("/leave-types/:id", requireAuth, requireRole(["admin"]), updateLeaveType);
timeOffRouter.delete("/leave-types/:id", requireAuth, requireRole(["admin"]), deleteLeaveType);

// Leave Balances Routes
timeOffRouter.get("/balances/me", requireAuth, getMyBalances);
timeOffRouter.get("/balances/employee/:employeeId", requireAuth, requireRole(["approver", "admin"]), getEmployeeBalances);
timeOffRouter.post("/balances/allocate", requireAuth, requireRole(["admin"]), allocateBalance);
timeOffRouter.post("/balances/bulk-allocate", requireAuth, requireRole(["admin"]), bulkAllocateBalances);

// Leave Requests Routes
timeOffRouter.get("/requests", requireAuth, listLeaveRequests);
timeOffRouter.get("/requests/:id", requireAuth, getLeaveRequest);
timeOffRouter.post("/requests", requireAuth, createLeaveRequest);
timeOffRouter.put("/requests/:id", requireAuth, updateLeaveRequest);
timeOffRouter.delete("/requests/:id/cancel", requireAuth, cancelLeaveRequest);
timeOffRouter.post("/requests/:id/approve", requireAuth, requireRole(["approver", "admin"]), approveLeaveRequest);

// Additional endpoints for enhanced workflow
timeOffRouter.get("/requests/pending/mine", requireAuth, requireRole(["approver", "admin"]), listLeaveRequests);
