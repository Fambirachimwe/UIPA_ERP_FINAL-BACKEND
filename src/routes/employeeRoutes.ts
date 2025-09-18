import { Router } from "express";
import { requireAuth, requireRole, abacPolicy } from "../middleware/auth";
import { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, createEmployeeWithUser } from "../controllers/employeesController";

export const employeeRouter = Router();

// Everyone authenticated can list & read
employeeRouter.get("/", requireAuth, listEmployees);
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

// Combined endpoint to create User + Employee in one transaction
employeeRouter.post(
    "/create-with-user",
    requireAuth,
    requireRole(["admin"]),
    createEmployeeWithUser
);


