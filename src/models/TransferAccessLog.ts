import mongoose, { Schema, Document, Model } from "mongoose";

export type AccessStatus = "success" | "password_required" | "password_failed" | "expired" | "not_found";

export interface TransferAccessLogDocument extends Document {
    transferId?: mongoose.Types.ObjectId;
    shortCode: string;
    ip: string;
    userAgent?: string;
    status: AccessStatus;
    createdAt: Date;
}

const transferAccessLogSchema = new Schema<TransferAccessLogDocument>(
    {
        transferId: { type: Schema.Types.ObjectId, ref: "Transfer" },
        shortCode: { type: String, index: true, required: true },
        ip: { type: String, required: true },
        userAgent: { type: String },
        status: { type: String, enum: ["success", "password_required", "password_failed", "expired", "not_found"], required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const TransferAccessLog: Model<TransferAccessLogDocument> =
    mongoose.models.TransferAccessLog || mongoose.model<TransferAccessLogDocument>("TransferAccessLog", transferAccessLogSchema);


