import mongoose, { Schema, Document, Model } from "mongoose";

export interface NotificationDocument extends Document {
    recipientId: mongoose.Types.ObjectId; // User who will receive the notification
    senderId?: mongoose.Types.ObjectId; // User who triggered the notification (optional)
    type: "leave_request_submitted" | "leave_request_approved" | "leave_request_rejected" | "leave_request_cancelled" | "general";
    title: string;
    message: string;
    relatedEntityType?: "LeaveRequest" | "Employee" | "Document"; // Type of related entity
    relatedEntityId?: mongoose.Types.ObjectId; // ID of related entity (e.g., LeaveRequest ID)
    isRead: boolean;
    priority: "low" | "medium" | "high";
    actionUrl?: string; // URL to navigate to when notification is clicked
    metadata?: Record<string, any>; // Additional data for the notification
    expiresAt?: Date; // Optional expiration date for notifications
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
    {
        recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        senderId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        type: {
            type: String,
            required: true,
            enum: ["leave_request_submitted", "leave_request_approved", "leave_request_rejected", "leave_request_cancelled", "general"],
            index: true,
        },
        title: { type: String, required: true, maxlength: 200 },
        message: { type: String, required: true, maxlength: 1000 },
        relatedEntityType: {
            type: String,
            enum: ["LeaveRequest", "Employee", "Document"],
            index: true,
        },
        relatedEntityId: { type: Schema.Types.ObjectId, index: true },
        isRead: { type: Boolean, default: false, index: true },
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
            index: true,
        },
        actionUrl: { type: String, maxlength: 500 },
        metadata: { type: Schema.Types.Mixed },
        expiresAt: { type: Date, index: true },
    },
    { timestamps: true }
);

// Compound indexes for efficient queries
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

// Instance methods
notificationSchema.methods.markAsRead = function () {
    this.isRead = true;
    return this.save();
};

// Static methods
notificationSchema.statics.getUnreadCount = function (recipientId: string) {
    return this.countDocuments({ recipientId, isRead: false });
};

notificationSchema.statics.markAllAsRead = function (recipientId: string) {
    return this.updateMany({ recipientId, isRead: false }, { isRead: true });
};

export const Notification: Model<NotificationDocument> =
    mongoose.models.Notification || mongoose.model<NotificationDocument>("Notification", notificationSchema);
