import { Request, Response } from "express";
import { z } from "zod";
import { LeaveRequest } from "../models/LeaveRequest";
import { LeaveBalance } from "../models/LeaveBalance";
import { LeaveType } from "../models/LeaveType";
import { Employee } from "../models/Employee";
import { User } from "../models/User";
import { AuthenticatedRequest } from "../middleware/auth";
import { EmailService } from "../services/emailService";

const createRequestSchema = z.object({
    leaveTypeId: z.string(),
    // Dated flow (optional depending on policy)
    startDate: z.string().transform((str) => new Date(str)).optional(),
    endDate: z.string().transform((str) => new Date(str)).optional(),
    // Non-dated flow
    occurredOn: z.string().transform((str) => new Date(str)).optional(),
    isOpenEnded: z.boolean().optional(),
    durationDays: z.number().min(0.5).optional(),
    reason: z.string().min(1),
    supervisorId: z.string().optional(), // Selected supervisor for approval
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

    // console.log("this is the user in the leave requests controller", req.user);

    // Build query based on user role
    if (req.user.role === "employee") {
        // Using user id as the employeeId stored on LeaveRequest
        query.employeeId = req.user.id;
        console.log("this is the query", query);
    } else if (req.user.role === "approver") {
        // Approvers see requests from their direct reports and department
        const approverEmployee = await Employee.findOne({ userId: req.user.id });

        console.log("this is the approver employee", approverEmployee);
        if (approverEmployee) {

            // i want to display only the requests that  approverEmployee is the supervisor
            query.supervisorId = approverEmployee._id;

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


    console.log("this is the query", query);
    if (status && pending !== "true") query.status = status;
    if (startDate || endDate) {
        // For dated requests, filter by startDate range
        query.$or = [
            {
                startDate: {
                    ...(startDate ? { $gte: new Date(startDate as string) } : {}),
                    ...(endDate ? { $lte: new Date(endDate as string) } : {}),
                }
            },
            // Also include non-dated requests by occurredOn within range
            {
                occurredOn: {
                    ...(startDate ? { $gte: new Date(startDate as string) } : {}),
                    ...(endDate ? { $lte: new Date(endDate as string) } : {}),
                }
            }
        ];
    }


    const requests = await LeaveRequest.find(query)
        .populate("employeeId", "email")
        .populate("leaveTypeId", "name")
        .populate("approvalHistory.approverId", "email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

    // Enrich with employee name by joining Employee on userId (which equals employeeId)
    const userIds = requests
        .map((r: any) => r.employeeId?._id)
        .filter((id: any) => !!id);

    let employeeByUserId = new Map<string, { name: string }>();
    if (userIds.length > 0) {
        const employees = await Employee.find({ userId: { $in: userIds } }, { userId: 1, name: 1 }).lean();
        for (const emp of employees) {
            employeeByUserId.set((emp.userId as any).toString(), { name: emp.name });
        }
    }



    const enriched = requests.map((r: any) => {
        const userId = r.employeeId?._id?.toString();
        const name = userId ? employeeByUserId.get(userId)?.name : undefined;
        if (name && r.employeeId) {
            r.employeeId = { ...r.employeeId, name };
        }
        return r;
    });

    return res.json(enriched);
}



export async function getLeaveRequest(req: Request, res: Response) {
    const { id } = req.params;
    const request = await LeaveRequest.findById(id)
        .populate("employeeId", "email")
        .populate("leaveTypeId", "name")
        .populate("approvalHistory.approverId", "email")
        .lean();
    if (!request) return res.status(404).json({ error: "Leave request not found" });

    // Enrich employeeId with name from Employee by userId
    const userId = (request as any).employeeId?._id;
    if (userId) {
        const employee = await Employee.findOne({ userId }, { name: 1 }).lean();
        if (employee) {
            (request as any).employeeId = { ...(request as any).employeeId, name: employee.name };
        }
    }

    return res.json(request);
}

export async function closeOpenEndedRequest(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const body = z.object({ closedOn: z.string().transform((s) => new Date(s)) }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.flatten() });

    const request = await LeaveRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Leave request not found" });

    // Only approver/admin can close
    if (!req.user || !["approver", "admin"].includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    if (!request.isOpenEnded) return res.status(400).json({ error: "Request is not open-ended" });

    const closedOn = body.data.closedOn;
    if (!request.occurredOn) return res.status(400).json({ error: "Request missing occurredOn" });
    if (closedOn < request.occurredOn) return res.status(400).json({ error: "closedOn must be after occurredOn" });

    request.closedOn = closedOn;
    request.isOpenEnded = false;
    // derive duration days (working days or calendar days?). For simplicity, calendar days here
    const ms = closedOn.getTime() - request.occurredOn.getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
    request.durationDays = days;
    await request.save();

    const populated = await LeaveRequest.findById(id)
        .populate("employeeId", "email")
        .populate("leaveTypeId", "name")
        .lean();
    return res.json(populated);
}

export async function createLeaveRequest(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    console.log("this is the user  in the leave requests controller", req.user);

    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { leaveTypeId } = parsed.data;

    // Find employee profile
    const employee = await Employee.findOne({ userId: req.user.id });
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    // Validate supervisor if provided
    let validatedSupervisorId = parsed.data.supervisorId;
    if (parsed.data.supervisorId) {
        const supervisor = await Employee.findById(parsed.data.supervisorId).populate('userId');
        if (!supervisor || !supervisor.userId) {
            return res.status(400).json({ error: "Invalid supervisor selected" });
        }

        // Check if supervisor has approval rights
        const supervisorUser = supervisor.userId as any;
        const hasApprovalRights = supervisorUser.role === 'admin' ||
            supervisorUser.role === 'approver' ||
            supervisorUser.attributes?.approval_level === 'level1';

        if (!hasApprovalRights) {
            return res.status(400).json({ error: "Selected supervisor does not have approval rights" });
        }
    } else {
        // If no supervisor selected, use direct manager if available
        if (employee.manager) {
            validatedSupervisorId = employee.manager.toString();
        }
    }

    // Fetch leave type policies
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) return res.status(404).json({ error: "Leave type not found" });

    const now = new Date();
    const { startDate, endDate, occurredOn, isOpenEnded, durationDays, reason, documents } = parsed.data;

    let totalDays: number | undefined = undefined;
    let currentYear: number | undefined = undefined;

    if (leaveType.requiresDates) {
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Start and end dates are required for this leave type" });
        }
        if (startDate > endDate) {
            return res.status(400).json({ error: "Start date must be before or equal to end date" });
        }
        if (!leaveType.allowFutureApplications && startDate > now) {
            return res.status(400).json({ error: "Future-dated requests are not allowed for this leave type" });
        }
        // For standard dated leave we typically disallow past submissions
        if (leaveType.allowFutureApplications && startDate < now) {
            return res.status(400).json({ error: "Cannot request leave for past dates" });
        }

        totalDays = calculateWorkingDays(startDate, endDate);

        // Overlap check only for dated requests
        const overlapping = await LeaveRequest.findOne({
            employeeId: req.user.id,
            status: { $in: ["submitted", "approved_lvl1", "approved_final"] },
            $or: [
                { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
            ]
        });
        if (overlapping) {
            return res.status(409).json({ error: "Overlapping leave request exists" });
        }

        // Balance checks if required
        if (leaveType.requiresBalance) {
            currentYear = startDate.getFullYear();
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
        }

        const leaveRequest = await LeaveRequest.create({
            employeeId: req.user.id as any,
            leaveTypeId,
            startDate,
            endDate,
            totalDays,
            reason,
            supervisorId: validatedSupervisorId,
            documents,
        });

        // Update pending balance for dated and balance-required types
        if (leaveType.requiresBalance && totalDays && startDate) {
            try {
                await LeaveBalance.findOneAndUpdate(
                    { employeeId: employee._id, leaveTypeId, year: startDate.getFullYear() },
                    { $inc: { pending: totalDays } },
                    { upsert: false }
                );
            } catch (e) {
                console.error("Failed to increment pending balance on submission:", e);
            }
        }

        return await respondWithPopulatedRequest(leaveRequest._id, res);
    } else {
        // Non-dated flow (e.g., Sick Leave)
        if (startDate || endDate) {
            return res.status(400).json({ error: "Dates must not be provided for this leave type" });
        }
        if (!occurredOn) {
            return res.status(400).json({ error: "Occurred date is required" });
        }
        if (occurredOn > now) {
            return res.status(400).json({ error: "Occurred date cannot be in the future" });
        }
        if (leaveType.maxRetroactiveDays && leaveType.maxRetroactiveDays > 0) {
            const ms = now.getTime() - occurredOn.getTime();
            const days = Math.floor(ms / (1000 * 60 * 60 * 24));
            if (days > leaveType.maxRetroactiveDays) {
                return res.status(400).json({ error: `Reporting window exceeded (${leaveType.maxRetroactiveDays} days)` });
            }
        }

        const isOpen = Boolean(isOpenEnded);
        const payload: any = {
            employeeId: req.user.id as any,
            leaveTypeId,
            occurredOn,
            isOpenEnded: isOpen,
            reason,
            supervisorId: validatedSupervisorId,
            documents,
            status: "reported",
        };

        if (!isOpen) {
            const dur = durationDays ?? 1;
            payload.durationDays = dur;
        } else {
            // if open-ended not allowed, reject
            if (!leaveType.isOpenEndedAllowed) {
                return res.status(400).json({ error: "Open-ended requests are not allowed for this leave type" });
            }
        }

        const leaveRequest = await LeaveRequest.create(payload);
        return await respondWithPopulatedRequest(leaveRequest._id, res);
    }

}

async function respondWithPopulatedRequest(id: any, res: Response) {
    const populatedRequest = await LeaveRequest.findById(id)
        .populate("employeeId", "email")
        .populate("leaveTypeId", "name")
        .populate("supervisorId", "name email department")
        .lean();

    if (populatedRequest?.employeeId && (populatedRequest as any).employeeId._id) {
        const { Employee } = await import("../models/Employee");
        const emp = await Employee.findOne({ userId: (populatedRequest as any).employeeId._id }, { name: 1 }).lean();
        if (emp) {
            (populatedRequest as any).employeeId = { ...(populatedRequest as any).employeeId, name: emp.name };
        }
    }
    return res.status(201).json(populatedRequest);
}

export async function updateLeaveRequest(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const parsed = createRequestSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const request = await LeaveRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Leave request not found" });

    // Only allow updates for submitted/reported requests
    if (!["submitted", "reported"].includes(request.status as any)) {
        return res.status(400).json({ error: "Cannot update request after submission" });
    }

    // Check if user owns this request (employees) or has permission (managers/admin)
    if (req.user?.role === "employee") {
        if (!request.employeeId.equals(req.user.id as any)) {
            return res.status(403).json({ error: "Cannot update another employee's request" });
        }
    }

    const updated = await LeaveRequest.findByIdAndUpdate(id, parsed.data, { new: true })
        .populate("employeeId", "email")
        .populate("leaveTypeId", "name")
        .lean();

    if (!updated) return res.status(404).json({ error: "Leave request not found" });

    // Enrich name
    if ((updated as any).employeeId?._id) {
        const emp = await Employee.findOne({ userId: (updated as any).employeeId._id }, { name: 1 }).lean();
        if (emp) {
            (updated as any).employeeId = { ...(updated as any).employeeId, name: emp.name };
        }
    }

    return res.json(updated);
}

export async function cancelLeaveRequest(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const request = await LeaveRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Leave request not found" });

    // Check permissions (owner or higher roles handled by routes)
    if (req.user?.role === "employee") {
        if (!request.employeeId.equals(req.user.id as any)) {
            return res.status(403).json({ error: "Cannot cancel another employee's request" });
        }
    }

    try {
        // Map user id on request to employee document for balances
        const employee = await Employee.findOne({ userId: request.employeeId });
        if (employee) {
            const balanceQuery = {
                employeeId: employee._id,
                leaveTypeId: request.leaveTypeId,
                year: request.startDate?.getFullYear(),
            } as any;

            // Only affect balance for dated & requiresBalance types
            const lt = await LeaveType.findById(request.leaveTypeId);
            const isDated = Boolean(request.startDate && request.endDate);
            const shouldAffectBalance = lt?.requiresBalance && isDated && balanceQuery.year;

            if (request.status === "approved_final" && shouldAffectBalance) {
                // Reverse used days and restore allocated if already fully approved
                await LeaveBalance.findOneAndUpdate(balanceQuery, { $inc: { used: -request.totalDays, allocated: request.totalDays } });
            } else if ((request.status === "approved_lvl1" || request.status === "submitted") && shouldAffectBalance) {
                // Remove pending days
                await LeaveBalance.findOneAndUpdate(balanceQuery, { $inc: { pending: -request.totalDays } });
            }
            // For rejected/cancelled there is nothing to adjust further
        }
    } catch (e) {
        console.error("Failed to adjust balances on cancel:", e);
        // Continue with deletion to satisfy user action
    }

    // Delete the request entirely
    await LeaveRequest.findByIdAndDelete(id);

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

    // Create notification and send email for employee about status change
    try {
        // Create in-app notification
        const { notifyLeaveRequestStatusChange } = await import("../services/notificationService");
        await notifyLeaveRequestStatusChange(
            (request._id as any).toString(),
            (request.employeeId as any).toString(),
            req.user!.id,
            status,
            validation.level,
            comment
        );

        // Send email notification to employee
        const requestEmployee = await Employee.findById(request.employeeId).populate('userId');
        const leaveTypeDoc = await LeaveType.findById(request.leaveTypeId);
        const approverUser = await User.findById(req.user!.id);

        if (requestEmployee && requestEmployee.userId && leaveTypeDoc && approverUser) {
            const employeeUser = requestEmployee.userId as any;

            await EmailService.notifyLeaveRequestStatusChange(
                employeeUser.email,
                requestEmployee.name,
                leaveTypeDoc.name,
                request.startDate.toDateString(),
                request.endDate.toDateString(),
                request.totalDays,
                status,
                validation.level,
                approverUser.email, // Using approver email as name for now
                comment,
                (request._id as any).toString()
            );
        }
    } catch (error) {
        console.error('Error creating approval notification or sending email:', error);
        // Don't fail the approval if notification/email fails
    }

    // Update balance based on final status (only for dated & requiresBalance types)
    try {
        // Map user id stored on request.employeeId to Employee _id used in LeaveBalance
        const reqEmployee = await Employee.findOne({ userId: request.employeeId }, { _id: 1 }).lean();
        const employeeObjectId = reqEmployee?._id;

        if (employeeObjectId) {
            // Determine leave type policy
            const lt = await LeaveType.findById(request.leaveTypeId);
            const isDated = Boolean(request.startDate && request.endDate);
            const shouldAffectBalance = lt?.requiresBalance && isDated;

            if (validation.newStatus === "approved_final" && shouldAffectBalance) {
                // Final approval: move from pending to used
                await LeaveBalance.findOneAndUpdate(
                    { employeeId: employeeObjectId as any, leaveTypeId: request.leaveTypeId, year: request.startDate.getFullYear() },
                    {
                        $inc: {
                            pending: -request.totalDays,
                            used: request.totalDays,
                            allocated: -request.totalDays
                        }
                    }
                );
            } else if (validation.newStatus === "rejected" && shouldAffectBalance) {
                // Rejection at any level: remove from pending (restore to available)
                await LeaveBalance.findOneAndUpdate(
                    { employeeId: employeeObjectId as any, leaveTypeId: request.leaveTypeId, year: request.startDate.getFullYear() },
                    { $inc: { pending: -request.totalDays } }
                );
            }
        } else {
            console.warn("Could not resolve Employee for balance update on approval/rejection", request.employeeId);
        }
    } catch (e) {
        console.error("Failed to update leave balances on approval/rejection:", e);
        // Do not fail approval because of balance update issues
    }
    // Note: For "approved_lvl1" status, leave remains in pending until final approval

    const updatedRequest = await LeaveRequest.findById(id)
        .populate("employeeId", "email")
        .populate("leaveTypeId", "name")
        .lean();

    if (updatedRequest && (updatedRequest as any).employeeId?._id) {
        const emp = await Employee.findOne({ userId: (updatedRequest as any).employeeId._id }, { name: 1 }).lean();
        if (emp) {
            (updatedRequest as any).employeeId = { ...(updatedRequest as any).employeeId, name: emp.name };
        }
    }

    return res.json(updatedRequest);
}

export async function undoFinalApproval(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const request = await LeaveRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Leave request not found" });

    // Only admin can undo; route will also enforce this, but double-check
    if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Only admins can undo a final approval" });
    }

    if (request.status !== "approved_final") {
        return res.status(400).json({ error: "Only final approved requests can be undone" });
    }

    console.log("request for the undo final approval but only admin can do this", request);

    // Reverse balances: move from used back to pending (only for dated & requiresBalance types)
    try {
        const reqEmployee = await Employee.findOne({ userId: request.employeeId }, { _id: 1 }).lean();
        const employeeObjectId = reqEmployee?._id;
        if (employeeObjectId) {
            const lt = await LeaveType.findById(request.leaveTypeId);
            const isDated = Boolean(request.startDate && request.endDate);
            const shouldAffectBalance = lt?.requiresBalance && isDated;
            if (shouldAffectBalance) {
                await LeaveBalance.findOneAndUpdate(
                    { employeeId: employeeObjectId as any, leaveTypeId: request.leaveTypeId, year: request.startDate.getFullYear() },
                    {
                        $inc: {
                            used: -request.totalDays,
                            pending: request.totalDays,
                            allocated: request.totalDays,
                        }
                    }
                );
            }
        }
    } catch (e) {
        console.error("Failed to reverse balances on undo final approval:", e);
    }

    // Revert status to approved_lvl1 (still pending final approval)
    request.status = "approved_lvl1" as any;
    await request.save();

    const updated = await LeaveRequest.findById(id)
        .populate("employeeId", "email")
        .populate("leaveTypeId", "name")
        .lean();

    if (updated && (updated as any).employeeId?._id) {
        const emp = await Employee.findOne({ userId: (updated as any).employeeId._id }, { name: 1 }).lean();
        if (emp) {
            (updated as any).employeeId = { ...(updated as any).employeeId, name: emp.name };
        }
    }

    return res.json(updated);
}
