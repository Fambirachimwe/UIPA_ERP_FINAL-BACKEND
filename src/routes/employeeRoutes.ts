import { Router } from "express";
import { requireAuth, requireRole, abacPolicy } from "../middleware/auth";
import { uploadDocument } from "../middleware/upload";
import { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, createEmployeeWithUser, getEligibleSupervisors, initializeLeaveBalances, uploadEmployeeDocument, deleteEmployeeDocument } from "../controllers/employeesController";
import path from "path";
import fs from "fs";

export const employeeRouter = Router();

// Everyone authenticated can list & read
employeeRouter.get("/", requireAuth, listEmployees);
employeeRouter.get("/eligible-supervisors", requireAuth, getEligibleSupervisors);
employeeRouter.get("/:id", requireAuth, getEmployee);

// Create/Update/Delete
employeeRouter.post(
    "/",
    requireAuth,
    requireRole(["admin", "approver"]),
    createEmployee
);

employeeRouter.put(
    "/:id",
    requireAuth,
    abacPolicy((req) => {
        // Admins or managers with department match can update
        if (req.user?.role === "admin") return true;
        const userDept = (req.user?.attributes as any)?.department;
        const bodyDept = (req.body as any)?.department;
        return req.user?.role === "approver" && !!userDept && userDept === bodyDept;
    }),
    updateEmployee
);

employeeRouter.delete(
    "/:id",
    requireAuth,
    requireRole(["admin"]),
    deleteEmployee
);


// /api/employees/68ce612542a85b89a02353d3/documents/upload
// Combined endpoint to create User + Employee in one transaction
employeeRouter.post(
    "/create-with-user",
    requireAuth,
    requireRole(["admin"]),
    createEmployeeWithUser
);

// Initialize leave balances for an employee
employeeRouter.post(
    "/:employeeId/initialize-leave-balances",
    requireAuth,
    requireRole(["admin"]),
    initializeLeaveBalances
);

// Employee Document Management - Admin only
employeeRouter.post(
    "/:id/documents/upload",
    requireAuth,
    requireRole(["admin"]),
    uploadDocument,
    uploadEmployeeDocument
);

employeeRouter.delete(
    "/:id/documents",
    requireAuth,
    requireRole(["admin"]),
    deleteEmployeeDocument
);

// Serve employee documents
employeeRouter.get(
    "/documents/:filename",
    requireAuth,
    (req, res) => {
        const { filename } = req.params;
        const filePath = path.join(process.cwd(), "uploads", "documents", filename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found" });
        }

        // Send file
        res.sendFile(filePath);
    }
);


