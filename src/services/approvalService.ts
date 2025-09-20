import { Employee } from "../models/Employee";
import { User } from "../models/User";
import { LeaveRequest } from "../models/LeaveRequest";
import { LeaveType } from "../models/LeaveType";
import mongoose from "mongoose";

export interface ApprovalContext {
    request: any;
    approver: {
        userId: string;
        role: "employee" | "approver" | "admin";
        attributes?: Record<string, unknown>;
    };
}

export interface ApprovalValidation {
    canApprove: boolean;
    error?: string;
    level: "level1" | "level2";
    newStatus: "approved_lvl1" | "approved_final" | "rejected";
}

/**
 * Validates if the approver can approve this request at the current level
 */
export async function validateApproval(
    context: ApprovalContext,
    requestedAction: "approved" | "rejected"
): Promise<ApprovalValidation> {
    const { request, approver } = context;

    // Get approver's employee record
    const approverEmployee = await Employee.findOne({ userId: approver.userId });
    if (!approverEmployee) {
        return {
            canApprove: false,
            error: "Approver employee profile not found",
            level: "level1",
            newStatus: "rejected"
        };
    }

    // Get request employee with manager populated
    const requestEmployee = await Employee.findById(request.employeeId).populate('manager');
    if (!requestEmployee) {
        return {
            canApprove: false,
            error: "Request employee not found",
            level: "level1",
            newStatus: "rejected"
        };
    }

    // Get leave type to check if it requires approval
    const leaveType = await LeaveType.findById(request.leaveTypeId);
    if (!leaveType) {
        return {
            canApprove: false,
            error: "Leave type not found",
            level: "level1",
            newStatus: "rejected"
        };
    }

    // Check auto-approval rules first
    // const autoApproval = checkAutoApprovalRules(request, leaveType);
    // if (autoApproval.autoApprove && approver.role === "admin") {
    //     return {
    //         canApprove: true,
    //         level: "level2",
    //         newStatus: requestedAction === "approved" ? "approved_final" : "rejected"
    //     };
    // }

    // Level 1 Approval (Supervisor)
    if (request.status === "submitted") {
        return validateLevel1Approval(request, requestEmployee, approverEmployee, approver, requestedAction);
    }

    // Level 2 Approval (Admin/Final)
    if (request.status === "approved_lvl1") {
        return validateFinalApproval(requestEmployee, approverEmployee, approver, requestedAction);
    }

    return {
        canApprove: false,
        error: "Request is not in a state that can be processed",
        level: "level1",
        newStatus: "rejected"
    };
}

/**
 * Validate Level 1 (Supervisor) approval
 */
function validateLevel1Approval(
    request: any,
    requestEmployee: any,
    approverEmployee: any,
    approver: any,
    requestedAction: "approved" | "rejected"
): ApprovalValidation {

    // Admin can approve any level 1 request
    if (approver.role === "admin") {
        return {
            canApprove: true,
            level: "level1",
            newStatus: requestedAction === "approved" ? "approved_lvl1" : "rejected"
        };
    }

    // Check if approver is the selected supervisor for this request
    const isSelectedSupervisor = request.supervisorId &&
        request.supervisorId.equals(approverEmployee._id);

    // Check if approver is the direct manager of the employee
    const isDirectManager = requestEmployee.manager &&
        requestEmployee.manager.equals(approverEmployee._id);

    // Non-admin users can only approve if they are the supervisor or direct manager
    if (!isSelectedSupervisor && !isDirectManager) {
        return {
            canApprove: false,
            error: "You can only approve leave requests where you are the selected supervisor or direct manager of the employee",
            level: "level1",
            newStatus: "rejected"
        };
    }

    return {
        canApprove: true,
        level: "level1",
        newStatus: requestedAction === "approved" ? "approved_lvl1" : "rejected"
    };
}

/**
 * Validate Level 2 (Admin/CEO) approval
 */
function validateFinalApproval(
    requestEmployee: any,
    approverEmployee: any,
    approver: any,
    requestedAction: "approved" | "rejected"
): ApprovalValidation {

    // Only admins can give final approval
    if (approver.role !== "admin") {
        return {
            canApprove: false,
            error: "Only admins can give final approval",
            level: "level2",
            newStatus: "rejected"
        };
    }

    return {
        canApprove: true,
        level: "level2",
        newStatus: requestedAction === "approved" ? "approved_final" : "rejected"
    };
}

/**
 * Check if request qualifies for auto-approval
 */
function checkAutoApprovalRules(request: any, leaveType: any): { autoApprove: boolean; reason?: string } {
    // Auto-approve sick leave less than 3 days
    if (leaveType.name.toLowerCase().includes('sick') && request.totalDays < 3) {
        return { autoApprove: true, reason: "Sick leave under 3 days" };
    }

    // Check if leave type doesn't require approval
    if (!leaveType.requiresApproval) {
        return { autoApprove: true, reason: "Leave type doesn't require approval" };
    }

    return { autoApprove: false };
}

/**
 * Get pending requests for a supervisor/manager
 */
export async function getPendingRequestsForApprover(approverId: string, role: string) {
    const approverEmployee = await Employee.findOne({ userId: approverId });
    if (!approverEmployee) return [];

    let query: any = {};

    if (role === "admin") {
        // Admins see all requests needing approval at any level
        query = {
            status: { $in: ["submitted", "approved_lvl1"] }
        };
    } else {
        // Non-admin users see only requests where they are the supervisor or direct manager
        const directReports = await Employee.find({ manager: approverEmployee._id });
        const directReportIds = directReports.map(emp => emp._id);

        query = {
            $or: [
                // Requests where they are the selected supervisor
                { supervisorId: approverEmployee._id, status: "submitted" },
                // Requests from their direct reports (where no specific supervisor was selected)
                {
                    employeeId: { $in: directReportIds },
                    supervisorId: { $exists: false },
                    status: "submitted"
                },
                // Requests from their direct reports where they are also the selected supervisor
                {
                    employeeId: { $in: directReportIds },
                    supervisorId: approverEmployee._id,
                    status: "submitted"
                }
            ]
        };
    }

    return LeaveRequest.find(query)
        .populate("employeeId", "name email department")
        .populate("leaveTypeId", "name")
        .populate("supervisorId", "name email department")
        .sort({ createdAt: -1 });
}
