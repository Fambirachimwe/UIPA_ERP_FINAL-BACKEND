import mongoose, { Schema, Document, Model } from "mongoose";

export interface ApprovalHistoryItem {
    approverId: mongoose.Types.ObjectId;
    level: string;
    status: "approved" | "rejected";
    comment?: string;
    timestamp: Date;
}

export interface LeaveRequestDocument extends Document {
    employeeId: mongoose.Types.ObjectId; // stores User _id per requirement
    leaveTypeId: mongoose.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    totalDays: number;
    reason: string;
    status: "submitted" | "approved_lvl1" | "approved_final" | "rejected" | "cancelled";
    // Selected supervisor for this specific request (overrides default manager)
    supervisorId?: mongoose.Types.ObjectId;
    approvalHistory: ApprovalHistoryItem[];
    documents?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const approvalHistorySchema = new Schema({
    approverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    level: { type: String, required: true },
    status: { type: String, enum: ["approved", "rejected"], required: true },
    comment: { type: String },
    timestamp: { type: Date, default: Date.now },
});

const leaveRequestSchema = new Schema<LeaveRequestDocument>(
    {
        employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        leaveTypeId: { type: Schema.Types.ObjectId, ref: "LeaveType", required: true, index: true },
        startDate: { type: Date, required: true, index: true },
        endDate: { type: Date, required: true, index: true },
        totalDays: { type: Number, required: true, min: 0.5 },
        reason: { type: String, required: true },
        status: {
            type: String,
            enum: ["submitted", "approved_lvl1", "approved_final", "rejected", "cancelled"],
            default: "submitted",
            index: true,
        },
        supervisorId: { type: Schema.Types.ObjectId, ref: "Employee", index: true },
        approvalHistory: [approvalHistorySchema],
        documents: [{ type: String }],
    },
    { timestamps: true }
);

// Index for date range queries
leaveRequestSchema.index({ startDate: 1, endDate: 1 });
leaveRequestSchema.index({ employeeId: 1, status: 1 });

export const LeaveRequest: Model<LeaveRequestDocument> =
    mongoose.models.LeaveRequest || mongoose.model<LeaveRequestDocument>("LeaveRequest", leaveRequestSchema);
