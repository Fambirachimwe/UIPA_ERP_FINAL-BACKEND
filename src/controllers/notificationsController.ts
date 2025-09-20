import { Request, Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadNotificationCount
} from "../services/notificationService";

// Validation schemas
const paginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    unreadOnly: z.coerce.boolean().default(false),
    type: z.string().optional()
});

const markReadSchema = z.object({
    notificationIds: z.array(z.string()).optional(),
    markAll: z.boolean().default(false)
});

/**
 * Get notifications for the authenticated user
 * GET /api/notifications
 */
export async function getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
        const userId = req.user!.id;
        const parsed = paginationSchema.safeParse(req.query);

        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const { page, limit, unreadOnly, type } = parsed.data;

        const result = await getUserNotifications(userId, {
            page,
            limit,
            unreadOnly,
            type
        });

        return res.json(result);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export async function getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
        const userId = req.user!.id;
        const count = await getUnreadNotificationCount(userId);

        return res.json({ unreadCount: count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Mark notifications as read
 * POST /api/notifications/mark-read
 */
export async function markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
        const userId = req.user!.id;
        const parsed = markReadSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const { notificationIds, markAll } = parsed.data;

        let modifiedCount = 0;

        if (markAll) {
            // Mark all notifications as read
            modifiedCount = await markAllNotificationsAsRead(userId);
        } else if (notificationIds && notificationIds.length > 0) {
            // Mark specific notifications as read
            const results = await Promise.all(
                notificationIds.map(id => markNotificationAsRead(id, userId))
            );
            modifiedCount = results.filter(result => result).length;
        } else {
            return res.status(400).json({ error: "Either notificationIds or markAll must be provided" });
        }

        return res.json({
            success: true,
            modifiedCount,
            message: `${modifiedCount} notification(s) marked as read`
        });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
export async function deleteNotificationById(req: AuthenticatedRequest, res: Response) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const deleted = await deleteNotification(id, userId);

        if (!deleted) {
            return res.status(404).json({ error: "Notification not found" });
        }

        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting notification:', error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
