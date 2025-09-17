import { Request, Response } from "express";
import { z } from "zod";
import { LeaveType } from "../models/LeaveType";
import { AuthenticatedRequest } from "../middleware/auth";

const createLeaveTypeSchema = z.object({
    name: z.string().min(1),
    defaultDays: z.number().min(0),
    carryOverRules: z.string().min(1),
    maxConsecutiveDays: z.number().min(1).optional(),
    eligibility: z.string().optional(),
    requiresApproval: z.boolean().default(true),
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
    return res.status(201).json(leaveType);
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
