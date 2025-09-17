import mongoose, { Schema, Document, Model } from "mongoose";

export interface AuditLogDocument extends Document {
    userId?: mongoose.Types.ObjectId;
    action: string; // login_success, login_failure, CRUD events
    timestamp: Date;
    ipAddress?: string;
}

const auditLogSchema = new Schema<AuditLogDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        action: { type: String, required: true },
        timestamp: { type: Date, required: true, default: () => new Date() },
        ipAddress: { type: String },
    },
    { timestamps: false }
);

auditLogSchema.index({ userId: 1, timestamp: -1 });

export const AuditLog: Model<AuditLogDocument> =
    mongoose.models.AuditLog || mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);


