import { Request, Response } from "express";
import { z } from "zod";
import { LeaveBalance } from "../models/LeaveBalance";
import { LeaveType } from "../models/LeaveType";
import { Employee } from "../models/Employee";
import { AuthenticatedRequest } from "../middleware/auth";

const allocateBalanceSchema = z.object({
    employeeId: z.string(),
    leaveTypeId: z.string(),
    year: z.number().int().min(2020).max(2030),
    allocated: z.number().min(0),
    carryOver: z.number().min(0).default(0),
});

export async function getMyBalances(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    // Find employee record for this user
    const employee = await Employee.findOne({ userId: req.user.id });
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    const currentYear = new Date().getFullYear();
    const balances = await LeaveBalance.find({
        employeeId: employee._id,
        year: currentYear,
    }).populate("leaveTypeId", "name");

    return res.json(balances);
}

export async function getEmployeeBalances(req: AuthenticatedRequest, res: Response) {
    const { employeeId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    // Check if user can view this employee's balances
    const isAdmin = req.user?.role === "admin";
    const isApprover = req.user?.role === "approver";

    if (!isAdmin && !isApprover) {
        return res.status(403).json({ error: "Insufficient permissions" });
    }

    const balances = await LeaveBalance.find({
        employeeId,
        year: Number(year),
    }).populate("leaveTypeId", "name").populate("employeeId", "name email");

    return res.json(balances);
}

export async function allocateBalance(req: AuthenticatedRequest, res: Response) {
    const parsed = allocateBalanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { employeeId, leaveTypeId, year, allocated, carryOver } = parsed.data;

    // Verify employee and leave type exist
    const [employee, leaveType] = await Promise.all([
        Employee.findById(employeeId),
        LeaveType.findById(leaveTypeId),
    ]);

    if (!employee) return res.status(404).json({ error: "Employee not found" });
    if (!leaveType) return res.status(404).json({ error: "Leave type not found" });

    // Update or create balance
    const balance = await LeaveBalance.findOneAndUpdate(
        { employeeId, leaveTypeId, year },
        { allocated, carryOver },
        { new: true, upsert: true }
    ).populate("leaveTypeId", "name");

    return res.status(201).json(balance);
}

export async function bulkAllocateBalances(req: AuthenticatedRequest, res: Response) {
    const { year, allocations } = req.body;

    if (!year || !Array.isArray(allocations)) {
        return res.status(400).json({ error: "Year and allocations array required" });
    }

    const results = [];
    for (const allocation of allocations) {
        const parsed = allocateBalanceSchema.safeParse({ ...allocation, year });
        if (parsed.success) {
            try {
                const balance = await LeaveBalance.findOneAndUpdate(
                    { employeeId: parsed.data.employeeId, leaveTypeId: parsed.data.leaveTypeId, year },
                    { allocated: parsed.data.allocated, carryOver: parsed.data.carryOver || 0 },
                    { new: true, upsert: true }
                );
                results.push({ success: true, balance });
            } catch (error: any) {
                results.push({ success: false, error: error.message, allocation });
            }
        } else {
            results.push({ success: false, error: parsed.error.flatten(), allocation });
        }
    }

    return res.json({ results, processed: results.length });
}
