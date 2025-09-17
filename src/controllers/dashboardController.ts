import { Request, Response } from "express";
import { User } from "../models/User";
import { Employee } from "../models/Employee";
import { Vehicle } from "../models/Vehicle";
import { LeaveRequest } from "../models/LeaveRequest";
import { AuthenticatedRequest } from "../middleware/auth";

export async function getSystemStats(_req: Request, res: Response) {
    const [employees, users, vehicles] = await Promise.all([
        Employee.countDocuments(),
        User.countDocuments(),
        Vehicle.countDocuments(),
    ]);
    return res.json({ employees, users, vehicles });
}

export async function getVehicleStatus(_req: Request, res: Response) {
    const [active, inMaintenance, retired] = await Promise.all([
        Vehicle.countDocuments({ status: "active" }),
        Vehicle.countDocuments({ status: "in maintenance" }),
        Vehicle.countDocuments({ status: "retired" }),
    ]);
    return res.json({ active, inMaintenance, retired });
}

export async function getTeamPendingLeave(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    let pendingCount = 0;

    if (req.user.role === "admin") {
        // Admins see all pending requests (both levels)
        pendingCount = await LeaveRequest.countDocuments({
            status: { $in: ["submitted", "approved_lvl1"] }
        });
    } else if (req.user.role === "approver") {
        // Approvers see requests from their team that need level 1 approval
        const approverEmployee = await Employee.findOne({ userId: req.user.id });
        if (approverEmployee) {
            const directReports = await Employee.find({ manager: approverEmployee._id });
            const departmentEmployees = await Employee.find({
                department: approverEmployee.department,
                _id: { $ne: approverEmployee._id }
            });

            const employeeIds = [
                ...directReports.map(emp => emp._id),
                ...departmentEmployees.map(emp => emp._id)
            ];

            pendingCount = await LeaveRequest.countDocuments({
                employeeId: { $in: employeeIds },
                status: "submitted"
            });
        }
    }

    return res.json({ pending: pendingCount });
}