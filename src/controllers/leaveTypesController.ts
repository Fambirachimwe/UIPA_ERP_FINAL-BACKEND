import { Request, Response } from "express";
import { z } from "zod";
import { LeaveType } from "../models/LeaveType";
import { LeaveBalance } from "../models/LeaveBalance";
import { Employee } from "../models/Employee";
import { AuthenticatedRequest } from "../middleware/auth";

const createLeaveTypeSchema = z.object({
    name: z.string().min(1),
    defaultDays: z.number().min(0),
    carryOverRules: z.string().optional(),
    maxConsecutiveDays: z.number().min(1).optional(),
    eligibility: z.string().optional(),
    requiresApproval: z.boolean().default(true),
    // Policy flags
    requiresBalance: z.boolean().default(true),
    requiresDates: z.boolean().default(true),
    allowFutureApplications: z.boolean().default(true),
    isOpenEndedAllowed: z.boolean().default(false),
    maxRetroactiveDays: z.number().min(0).default(2),
    requiresAttachment: z.boolean().default(false),
});

export async function listLeaveTypes(req: AuthenticatedRequest, res: Response) {
    const isAdmin = req.user?.role === "admin";
    const query = isAdmin ? {} : { isActive: true };

    const leaveTypes = await LeaveType.find(query).sort({ name: 1 });
    return res.json(leaveTypes);
}

export async function getLeaveType(req: Request, res: Response) {
    const { id } = req.params;
    const leaveType = await LeaveType.findById(id);
    if (!leaveType) return res.status(404).json({ error: "Leave type not found" });
    return res.json(leaveType);
}

export async function createLeaveType(req: AuthenticatedRequest, res: Response) {
    const parsed = createLeaveTypeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await LeaveType.findOne({ name: parsed.data.name });
    if (existing) return res.status(409).json({ error: "Leave type name already exists" });

    const leaveType = await LeaveType.create(parsed.data);

    // Auto-allocate balances to all employees if defaultDays > 0
    if (parsed.data.defaultDays > 0) {
        await allocateLeaveTypeToAllEmployees(String(leaveType._id), parsed.data.defaultDays);
    }

    return res.status(201).json(leaveType);
}

/**
 * Allocate a new leave type to all existing employees
 */
async function allocateLeaveTypeToAllEmployees(leaveTypeId: string, defaultDays: number) {
    try {
        const currentYear = new Date().getFullYear();

        // Get all employees
        const employees = await Employee.find({ userId: { $exists: true } });

        // Create balance records for all employees
        const balancePromises = employees.map(employee =>
            LeaveBalance.findOneAndUpdate(
                {
                    employeeId: employee._id,
                    leaveTypeId,
                    year: currentYear
                },
                {
                    allocated: defaultDays,
                    used: 0,
                    pending: 0,
                    carryOver: 0
                },
                {
                    upsert: true,
                    new: true
                }
            )
        );

        await Promise.all(balancePromises);

        // eslint-disable-next-line no-console
        console.log(`✅ Allocated ${defaultDays} days of leave type ${leaveTypeId} to ${employees.length} employees`);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`❌ Failed to allocate leave type ${leaveTypeId}:`, error);
        // Don't throw error - leave type creation should still succeed
    }
}

export async function updateLeaveType(req: Request, res: Response) {
    const { id } = req.params;
    const parsed = createLeaveTypeSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const updated = await LeaveType.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!updated) return res.status(404).json({ error: "Leave type not found" });
    return res.json(updated);
}

export async function deleteLeaveType(req: Request, res: Response) {
    const { id } = req.params;
    // Soft delete by setting isActive to false
    const updated = await LeaveType.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) return res.status(404).json({ error: "Leave type not found" });
    return res.status(204).send();
}
