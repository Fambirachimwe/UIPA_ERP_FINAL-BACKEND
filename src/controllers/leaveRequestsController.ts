import { Request, Response } from "express";
import { z } from "zod";
import { LeaveRequest } from "../models/LeaveRequest";
import { LeaveBalance } from "../models/LeaveBalance";
import { LeaveType } from "../models/LeaveType";
import { Employee } from "../models/Employee";
import { AuthenticatedRequest } from "../middleware/auth";

const createRequestSchema = z.object({
    leaveTypeId: z.string(),
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
    reason: z.string().min(1),
    documents: z.array(z.string().url()).optional(),
});

const approvalSchema = z.object({
    status: z.enum(["approved", "rejected"]),
    comment: z.string().optional(),
});

// Helper function to calculate working days (excluding weekends)
function calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
}

export async function listLeaveRequests(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { status, startDate, endDate, pending } = req.query;
    let query: any = {};

    // Build query based on user role
    if (req.user.role === "employee") {
        const employee = await Employee.findOne({ userId: req.user.id });
        if (!employee) return res.status(404).json({ error: "Employee profile not found" });
        query.employeeId = employee._id;
    } else if (req.user.role === "approver") {
        // Approvers see requests from their direct reports and department
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

            query.employeeId = { $in: employeeIds };

            // If requesting pending items, show only submitted requests for approvers
            if (pending === "true") {
                query.status = "submitted";
            }
        }
    } else if (req.user.role === "admin") {
        // Admins see all requests, but if requesting pending, show both levels
        if (pending === "true") {
            query.status = { $in: ["submitted", "approved_lvl1"] };
        }
    }

    if (status && pending !== "true") query.status = status;
    if (startDate || endDate) {
        query.startDate = {};
        if (startDate) query.startDate.$gte = new Date(startDate as string);
        if (endDate) query.startDate.$lte = new Date(endDate as string);
    }

    const requests = await LeaveRequest.find(query)
        .populate("employeeId", "name email department")
        .populate("leaveTypeId", "name")
        .populate("approvalHistory.approverId", "email")
        .sort({ createdAt: -1 })
        .limit(100);

    return res.json(requests);
}

export async function getLeaveRequest(req: Request, res: Response) {
    const { id } = req.params;
    const request = await LeaveRequest.findById(id)
        .populate("employeeId", "name email")
        .populate("leaveTypeId", "name")
        .populate("approvalHistory.approverId", "email");

    if (!request) return res.status(404).json({ error: "Leave request not found" });
    return res.json(request);
}

export async function createLeaveRequest(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { leaveTypeId, startDate, endDate, reason, documents } = parsed.data;

    // Find employee profile
    const employee = await Employee.findOne({ userId: req.user.id });
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    // Validate dates
    if (startDate > endDate) {
        return res.status(400).json({ error: "Start date must be before or equal to end date" });
    }

    if (startDate < new Date()) {
        return res.status(400).json({ error: "Cannot request leave for past dates" });
    }

    // Calculate working days
    const totalDays = calculateWorkingDays(startDate, endDate);

    // Check for overlapping requests
    const overlapping = await LeaveRequest.findOne({
        employeeId: employee._id,
        status: { $in: ["submitted", "approved_lvl1", "approved_final"] },
        $or: [
            { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
        ]
    });

    if (overlapping) {
        return res.status(409).json({ error: "Overlapping leave request exists" });
    }

    // Check leave balance
    const currentYear = startDate.getFullYear();
    const balance = await LeaveBalance.findOne({
        employeeId: employee._id,
        leaveTypeId,
        year: currentYear,
    });

    if (!balance) {
        return res.status(400).json({ error: "No leave balance found for this leave type" });
    }

    const remaining = balance.allocated + balance.carryOver - balance.used - balance.pending;
    if (totalDays > remaining) {
        return res.status(400).json({
            error: `Insufficient leave balance. Requested: ${totalDays}, Available: ${remaining}`
        });
    }

    // Create the request
    const leaveRequest = await LeaveRequest.create({
        employeeId: employee._id,
        leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason,
        documents,
    });

    // Update pending balance
    await LeaveBalance.findByIdAndUpdate(balance._id, {
        $inc: { pending: totalDays }
    });

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
        .populate("employeeId", "name email")
        .populate("leaveTypeId", "name");

    return res.status(201).json(populatedRequest);
}

export async function updateLeaveRequest(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const parsed = createRequestSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const request = await LeaveRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Leave request not found" });

    // Only allow updates for submitted requests
    if (request.status !== "submitted") {
        return res.status(400).json({ error: "Cannot update request after submission" });
    }

    // Check if user owns this request (employees) or has permission (managers/admin)
    if (req.user?.role === "employee") {
        const employee = await Employee.findOne({ userId: req.user.id });
        if (!employee || !request.employeeId.equals(employee._id)) {
            return res.status(403).json({ error: "Cannot update another employee's request" });
        }
    }

    const updated = await LeaveRequest.findByIdAndUpdate(id, parsed.data, { new: true })
        .populate("employeeId", "name email")
        .populate("leaveTypeId", "name");

    return res.json(updated);
}

export async function cancelLeaveRequest(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const request = await LeaveRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Leave request not found" });

    // Only allow cancellation for submitted or level 1 approved requests
    if (!["submitted", "approved_lvl1"].includes(request.status)) {
        return res.status(400).json({ error: "Cannot cancel this request" });
    }

    // Check permissions
    if (req.user?.role === "employee") {
        const employee = await Employee.findOne({ userId: req.user.id });
        if (!employee || !request.employeeId.equals(employee._id)) {
            return res.status(403).json({ error: "Cannot cancel another employee's request" });
        }
    }

    // Update request status
    request.status = "cancelled";
    await request.save();

    // Update balance - remove from pending
    await LeaveBalance.findOneAndUpdate(
        { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: request.startDate.getFullYear() },
        { $inc: { pending: -request.totalDays } }
    );

    return res.status(204).send();
}

export async function approveLeaveRequest(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const parsed = approvalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { status, comment } = parsed.data;

    const request = await LeaveRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Leave request not found" });

    if (!["submitted", "approved_lvl1"].includes(request.status)) {
        return res.status(400).json({ error: "Request cannot be processed" });
    }

    // Import approval service
    const { validateApproval } = await import("../services/approvalService");

    // Validate approval permissions
    const validation = await validateApproval(
        {
            request,
            approver: {
                userId: req.user!.id,
                role: req.user!.role,
                attributes: req.user!.attributes
            }
        },
        status
    );

    if (!validation.canApprove) {
        return res.status(403).json({ error: validation.error });
    }

    // Add to approval history
    request.approvalHistory.push({
        approverId: req.user!.id as any,
        level: validation.level,
        status,
        comment,
        timestamp: new Date(),
    });

    request.status = validation.newStatus as any;
    await request.save();

    // Update balance if final approval or rejection
    if (validation.newStatus === "approved_final") {
        await LeaveBalance.findOneAndUpdate(
            { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: request.startDate.getFullYear() },
            {
                $inc: {
                    pending: -request.totalDays,
                    used: request.totalDays
                }
            }
        );
    } else if (validation.newStatus === "rejected") {
        await LeaveBalance.findOneAndUpdate(
            { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: request.startDate.getFullYear() },
            { $inc: { pending: -request.totalDays } }
        );
    }

    const updatedRequest = await LeaveRequest.findById(id)
        .populate("employeeId", "name email")
        .populate("leaveTypeId", "name");

    return res.json(updatedRequest);
}
