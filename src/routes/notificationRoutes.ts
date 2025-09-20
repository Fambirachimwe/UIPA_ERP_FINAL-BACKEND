import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    deleteNotificationById
} from "../controllers/notificationsController";

export const notificationRouter = Router();

// Get notifications for authenticated user
notificationRouter.get("/", requireAuth, getNotifications);

// Get unread notification count
notificationRouter.get("/unread-count", requireAuth, getUnreadCount);

// Mark notifications as read
notificationRouter.post("/mark-read", requireAuth, markAsRead);

// Delete notification
notificationRouter.delete("/:id", requireAuth, deleteNotificationById);
