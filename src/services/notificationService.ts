import { Notification, NotificationDocument } from "../models/Notification";
import { Employee } from "../models/Employee";
import { User } from "../models/User";
import { LeaveRequest } from "../models/LeaveRequest";

export interface CreateNotificationData {
    recipientId: string;
    senderId?: string;
    type: NotificationDocument['type'];
    title: string;
    message: string;
    relatedEntityType?: NotificationDocument['relatedEntityType'];
    relatedEntityId?: string;
    priority?: NotificationDocument['priority'];
    actionUrl?: string;
    metadata?: Record<string, any>;
    expiresAt?: Date;
}

/**
 * Creates a new notification
 */
export async function createNotification(data: CreateNotificationData): Promise<NotificationDocument> {
    const notification = await Notification.create(data);
    return notification;
}

/**
 * Creates multiple notifications (bulk)
 */
export async function createBulkNotifications(notifications: CreateNotificationData[]): Promise<any[]> {
    const createdNotifications = await Notification.insertMany(notifications);
    return createdNotifications;
}

/**
 * Get notifications for a user with pagination
 */
export async function getUserNotifications(
    userId: string,
    options: {
        page?: number;
        limit?: number;
        unreadOnly?: boolean;
        type?: string;
    } = {}
) {
    const { page = 1, limit = 20, unreadOnly = false, type } = options;
    const skip = (page - 1) * limit;

    const query: any = { recipientId: userId };

    if (unreadOnly) {
        query.isRead = false;
    }

    if (type) {
        query.type = type;
    }

    const notifications = await Notification.find(query)
        .populate('senderId', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

    return {
        notifications,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
        unreadCount,
    };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.updateOne(
        { _id: notificationId, recipientId: userId },
        { isRead: true }
    );
    return result.modifiedCount > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
        { recipientId: userId, isRead: false },
        { isRead: true }
    );
    return result.modifiedCount;
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.deleteOne({ _id: notificationId, recipientId: userId });
    return result.deletedCount > 0;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
    return await Notification.countDocuments({ recipientId: userId, isRead: false });
}

/**
 * Leave Request Notification Helpers
 */

/**
 * Notify supervisor when a leave request is submitted
 */
export async function notifyLeaveRequestSubmitted(
    leaveRequestId: string,
    employeeId: string,
    supervisorId: string
): Promise<NotificationDocument | null> {
    try {
        // Get employee and leave request details
        const employee = await Employee.findById(employeeId);
        const leaveRequest = await LeaveRequest.findById(leaveRequestId)
            .populate('leaveTypeId', 'name');

        if (!employee || !leaveRequest) return null;

        // Get supervisor's user ID
        const supervisor = await Employee.findById(supervisorId).populate('userId');
        if (!supervisor || !supervisor.userId) return null;

        const notification = await createNotification({
            recipientId: supervisor.userId._id.toString(),
            senderId: employee.userId?.toString(),
            type: 'leave_request_submitted',
            title: 'New Leave Request',
            message: `${employee.name} has submitted a leave request for ${(leaveRequest.leaveTypeId as any)?.name || 'leave'} from ${leaveRequest.startDate.toLocaleDateString()} to ${leaveRequest.endDate.toLocaleDateString()}`,
            relatedEntityType: 'LeaveRequest',
            relatedEntityId: leaveRequestId,
            priority: 'medium',
            actionUrl: `/time-off/requests/${leaveRequestId}`,
            metadata: {
                employeeName: employee.name,
                employeeDepartment: employee.department,
                leaveType: (leaveRequest.leaveTypeId as any)?.name,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                totalDays: leaveRequest.totalDays,
            }
        });

        return notification;
    } catch (error) {
        console.error('Error creating leave request notification:', error);
        return null;
    }
}

/**
 * Notify employee when their leave request is approved/rejected
 */
export async function notifyLeaveRequestStatusChange(
    leaveRequestId: string,
    employeeId: string,
    approverId: string,
    status: 'approved' | 'rejected',
    level: string,
    comment?: string
): Promise<NotificationDocument | null> {
    try {
        // Get employee and approver details
        const employee = await Employee.findById(employeeId).populate('userId');
        const approver = await Employee.findOne({ userId: approverId });
        const leaveRequest = await LeaveRequest.findById(leaveRequestId)
            .populate('leaveTypeId', 'name');

        if (!employee || !employee.userId || !leaveRequest) return null;

        const isApproved = status === 'approved';
        const statusText = isApproved ? 'Approved' : 'Rejected';
        const levelText = level === 'level1' ? 'Level 1' : 'Final';

        const notification = await createNotification({
            recipientId: employee.userId._id.toString(),
            senderId: approverId,
            type: isApproved ? 'leave_request_approved' : 'leave_request_rejected',
            title: `Leave Request ${statusText}`,
            message: `Your leave request for ${(leaveRequest.leaveTypeId as any)?.name || 'leave'} has been ${statusText.toLowerCase()} (${levelText})${approver ? ` by ${approver.name}` : ''}${comment ? `. Comment: ${comment}` : ''}`,
            relatedEntityType: 'LeaveRequest',
            relatedEntityId: leaveRequestId,
            priority: isApproved ? 'medium' : 'high',
            actionUrl: `/time-off/requests/${leaveRequestId}`,
            metadata: {
                leaveType: (leaveRequest.leaveTypeId as any)?.name,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                totalDays: leaveRequest.totalDays,
                approverName: approver?.name,
                level,
                comment,
            }
        });

        return notification;
    } catch (error) {
        console.error('Error creating leave request status notification:', error);
        return null;
    }
}

/**
 * Clean up expired notifications (can be run as a cron job)
 */
export async function cleanupExpiredNotifications(): Promise<number> {
    const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
    });
    return result.deletedCount;
}
