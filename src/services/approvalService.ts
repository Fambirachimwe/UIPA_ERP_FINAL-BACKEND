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
    const autoApproval = checkAutoApprovalRules(request, leaveType);
    if (autoApproval.autoApprove && approver.role === "admin") {
        return {
            canApprove: true,
            level: "level2",
            newStatus: requestedAction === "approved" ? "approved_final" : "rejected"
        };
    }

    // Level 1 Approval (Supervisor)
    if (request.status === "submitted") {
        return validateLevel1Approval(requestEmployee, approverEmployee, approver, requestedAction);
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
    requestEmployee: any,
    approverEmployee: any,
    approver: any,
    requestedAction: "approved" | "rejected"
): ApprovalValidation {

    // Check if user has level1 approval authority
    const approvalLevel = (approver.attributes as any)?.approval_level;
    const hasLevel1Authority = approvalLevel === "level1" || approver.role === "admin";

    if (!hasLevel1Authority) {
        return {
            canApprove: false,
            error: "Only level1 supervisors can approve leave requests at this stage",
            level: "level1",
            newStatus: "rejected"
        };
    }

    // Check if approver is the direct supervisor
    const isDirectSupervisor = requestEmployee.manager &&
        requestEmployee.manager._id.equals(approverEmployee._id);

    // Admin can approve any level 1 request
    const isAdmin = approver.role === "admin";

    // Level1 users can approve in their department
    const isSameDepartment = requestEmployee.department === approverEmployee.department;
    const isLevel1Approver = approvalLevel === "level1" && isSameDepartment;

    if (!isDirectSupervisor && !isAdmin && !isLevel1Approver) {
        return {
            canApprove: false,
            error: "You can only approve requests from your direct reports or department",
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

    // Check if user has level2 approval authority
    const approvalLevel = (approver.attributes as any)?.approval_level;
    const hasLevel2Authority = approvalLevel === "level2" || approver.role === "admin";

    if (!hasLevel2Authority) {
        return {
            canApprove: false,
            error: "Only level2 admins and CEO can give final approval",
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
        // Admins see all requests needing final approval
        query = {
            status: { $in: ["submitted", "approved_lvl1"] }
        };
    } else if (role === "approver") {
        // Approvers see requests from their direct reports or department
        const directReports = await Employee.find({ manager: approverEmployee._id });
        const departmentEmployees = await Employee.find({
            department: approverEmployee.department,
            _id: { $ne: approverEmployee._id }
        });

        const employeeIds = [
            ...directReports.map(emp => emp._id),
            ...departmentEmployees.map(emp => emp._id)
        ];

        query = {
            employeeId: { $in: employeeIds },
            status: "submitted"
        };
    }

    return LeaveRequest.find(query)
        .populate("employeeId", "name email department")
        .populate("leaveTypeId", "name")
        .sort({ createdAt: -1 });
}
