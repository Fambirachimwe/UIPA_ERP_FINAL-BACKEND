import mongoose, { Schema, Document, Model } from "mongoose";

export interface LeaveBalanceDocument extends Document {
    employeeId: mongoose.Types.ObjectId;
    leaveTypeId: mongoose.Types.ObjectId;
    year: number;
    allocated: number;
    used: number;
    pending: number;
    carryOver: number;
    createdAt: Date;
    updatedAt: Date;
    // Virtual field
    remaining: number;
}

const leaveBalanceSchema = new Schema<LeaveBalanceDocument>(
    {
        employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
        leaveTypeId: { type: Schema.Types.ObjectId, ref: "LeaveType", required: true, index: true },
        year: { type: Number, required: true, index: true },
        allocated: { type: Number, required: true, default: 0, min: 0 },
        used: { type: Number, required: true, default: 0, min: 0 },
        pending: { type: Number, required: true, default: 0, min: 0 },
        carryOver: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

// Compound index for unique constraint
leaveBalanceSchema.index({ employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

// Virtual for remaining days
leaveBalanceSchema.virtual("remaining").get(function (this: LeaveBalanceDocument) {
    return this.allocated + this.carryOver - this.used - this.pending;
});

// Ensure virtuals are included in JSON
leaveBalanceSchema.set("toJSON", { virtuals: true });

export const LeaveBalance: Model<LeaveBalanceDocument> =
    mongoose.models.LeaveBalance || mongoose.model<LeaveBalanceDocument>("LeaveBalance", leaveBalanceSchema);
