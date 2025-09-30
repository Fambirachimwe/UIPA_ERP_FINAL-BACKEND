import mongoose, { Schema, Document, Model } from "mongoose";

export interface LeaveTypeDocument extends Document {
    name: string;
    defaultDays?: number;
    carryOverRules?: string;
    maxConsecutiveDays?: number;
    eligibility?: string;
    requiresApproval: boolean;
    // Policy flags
    requiresBalance: boolean; // e.g., false for Sick Leave
    requiresDates: boolean; // e.g., false for Sick Leave
    allowFutureApplications: boolean; // e.g., false for Sick Leave
    isOpenEndedAllowed: boolean; // e.g., true for Sick Leave
    maxRetroactiveDays?: number; // how many days back reporting is allowed
    requiresAttachment?: boolean; // e.g., doctor note
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const leaveTypeSchema = new Schema<LeaveTypeDocument>(
    {
        name: { type: String, required: true, unique: true, index: true },
        defaultDays: { type: Number, default: 0 },
        carryOverRules: { type: String },
        maxConsecutiveDays: { type: Number, min: 1 },
        eligibility: { type: String },
        requiresApproval: { type: Boolean, default: true },
        // Policies with sensible defaults for traditional annual leave
        requiresBalance: { type: Boolean, default: false },
        requiresDates: { type: Boolean, default: false },
        allowFutureApplications: { type: Boolean, default: false },
        isOpenEndedAllowed: { type: Boolean, default: false },
        maxRetroactiveDays: { type: Number, min: 1, default: 10 },
        requiresAttachment: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const LeaveType: Model<LeaveTypeDocument> =
    mongoose.models.LeaveType || mongoose.model<LeaveTypeDocument>("LeaveType", leaveTypeSchema);
