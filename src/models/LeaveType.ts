import mongoose, { Schema, Document, Model } from "mongoose";

export interface LeaveTypeDocument extends Document {
    name: string;
    defaultDays: number;
    carryOverRules: string;
    maxConsecutiveDays?: number;
    eligibility?: string;
    requiresApproval: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const leaveTypeSchema = new Schema<LeaveTypeDocument>(
    {
        name: { type: String, required: true, unique: true, index: true },
        defaultDays: { type: Number, required: true, min: 0 },
        carryOverRules: { type: String, required: true },
        maxConsecutiveDays: { type: Number, min: 1 },
        eligibility: { type: String },
        requiresApproval: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const LeaveType: Model<LeaveTypeDocument> =
    mongoose.models.LeaveType || mongoose.model<LeaveTypeDocument>("LeaveType", leaveTypeSchema);
