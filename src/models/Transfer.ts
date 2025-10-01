import mongoose, { Schema, Document, Model } from "mongoose";

export interface TransferDocument extends Document {
    shortCode: string;
    title: string;
    description?: string;
    files: mongoose.Types.ObjectId[];
    passwordHash?: string;
    expiresAt?: Date;
    maxDownloads?: number;
    downloadCount: number;
    versioning?: {
        mode: "auto" | "explicit";
        currentVersion: number;
    };
    createdBy: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const transferSchema = new Schema<TransferDocument>(
    {
        shortCode: { type: String, required: true, unique: true, index: true },
        title: { type: String, required: true },
        description: { type: String },
        files: [{ type: Schema.Types.ObjectId, ref: "TransferFile" }],
        passwordHash: { type: String },
        expiresAt: { type: Date },
        maxDownloads: { type: Number },
        downloadCount: { type: Number, default: 0 },
        versioning: {
            mode: { type: String, enum: ["auto", "explicit"], default: "explicit" },
            currentVersion: { type: Number, default: 1 },
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Transfer: Model<TransferDocument> =
    mongoose.models.Transfer || mongoose.model<TransferDocument>("Transfer", transferSchema);


