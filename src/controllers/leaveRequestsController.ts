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
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
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
        query.startDate = {};
        if (startDate) query.startDate.$gte = new Date(startDate as string);
        if (endDate) query.startDate.$lte = new Date(endDate as string);
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

export async function createLeaveRequest(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    console.log("this is the user  in the leave requests controller", req.user);

    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { leaveTypeId, startDate, endDate, reason, supervisorId, documents } = parsed.data;

    // Find employee profile
    const employee = await Employee.findOne({ userId: req.user.id });
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    // Validate supervisor if provided
    let validatedSupervisorId = supervisorId;
    if (supervisorId) {
        const supervisor = await Employee.findById(supervisorId).populate('userId');
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
        employeeId: req.user.id,
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
        employeeId: req.user.id as any,
        leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason,
        supervisorId: validatedSupervisorId,
        documents,
    });

    console.log("this is the leave request saved in the database", leaveRequest);

    // Update pending balance
    // await LeaveBalance.findByIdAndUpdate(balance._id, {
    //     $inc: { pending: totalDays }
    // });

    // Create notification and send email to supervisor if one is assigned
    if (validatedSupervisorId) {
        try {
            // Create in-app notification
            const { notifyLeaveRequestSubmitted } = await import("../services/notificationService");
            await notifyLeaveRequestSubmitted(
                (leaveRequest._id as any).toString(),
                (employee._id as any).toString(),
                validatedSupervisorId
            );

            // Send email notification to supervisor
            const supervisorEmployee = await Employee.findById(validatedSupervisorId).populate('userId');
            const leaveTypeDoc = await LeaveType.findById(leaveTypeId);

            if (supervisorEmployee && supervisorEmployee.userId && leaveTypeDoc) {
                const supervisorUser = supervisorEmployee.userId as any;

                await EmailService.notifyLeaveRequestSubmission(
                    supervisorUser.email,
                    supervisorEmployee.name,
                    employee.name,
                    leaveTypeDoc.name,
                    startDate.toDateString(),
                    endDate.toDateString(),
                    totalDays,
                    reason,
                    (leaveRequest._id as any).toString()
                );
            }
        } catch (error) {
            console.error('Error creating notification or sending email:', error);
            // Don't fail the request creation if notification/email fails
        }
    }

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
        .populate("employeeId", "email")
        .populate("leaveTypeId", "name")
        .populate("supervisorId", "name email department")
        .lean();

    // Enrich employeeId with name for the create response as well
    if (populatedRequest?.employeeId && (populatedRequest as any).employeeId._id) {
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

    // Only allow updates for submitted requests
    if (request.status !== "submitted") {
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
                year: request.startDate.getFullYear(),
            } as any;

            if (request.status === "approved_final") {
                // Reverse used days if already fully approved
                await LeaveBalance.findOneAndUpdate(balanceQuery, { $inc: { used: -request.totalDays } });
            } else if (request.status === "approved_lvl1" || request.status === "submitted") {
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

    // Update balance based on final status
    if (validation.newStatus === "approved_final") {
        // Final approval: move from pending to used
        await LeaveBalance.findOneAndUpdate(
            { employeeId: request.employeeId as any, leaveTypeId: request.leaveTypeId, year: request.startDate.getFullYear() },
            {
                $inc: {
                    pending: -request.totalDays,
                    used: request.totalDays
                }
            }
        );
    } else if (validation.newStatus === "rejected") {
        // Rejection at any level: remove from pending (restore to available)
        await LeaveBalance.findOneAndUpdate(
            { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: request.startDate.getFullYear() },
            { $inc: { pending: -request.totalDays } }
        );
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

    // Reverse balances: move from used back to pending
    await LeaveBalance.findOneAndUpdate(
        { employeeId: request.employeeId as any, leaveTypeId: request.leaveTypeId, year: request.startDate.getFullYear() },
        {
            $inc: {
                used: -request.totalDays,
                pending: request.totalDays,
            }
        }
    );

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
