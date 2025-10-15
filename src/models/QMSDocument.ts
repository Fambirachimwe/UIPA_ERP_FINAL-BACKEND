import mongoose, { Document, Schema } from "mongoose";

export interface IQMSDocument extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    documentType: "policy" | "procedure" | "work_instruction" | "form" | "template";
    documentNumber: string;
    version: string;
    status: "draft" | "under_review" | "approved" | "obsolete";
    content: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    createdBy: mongoose.Types.ObjectId;
    reviewedBy?: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId;
    department: string;
    effectiveDate: Date;
    reviewDate?: Date;
    nextReviewDate: Date;
    accessRights: {
        view: mongoose.Types.ObjectId[];
        edit: mongoose.Types.ObjectId[];
        approve: mongoose.Types.ObjectId[];
    };
    changeHistory: Array<{
        version: string;
        changedBy: mongoose.Types.ObjectId;
        changeDate: Date;
        changeDescription: string;
        changeType: "created" | "updated" | "approved" | "obsoleted";
    }>;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

const QMSDocumentSchema = new Schema<IQMSDocument>(
    {
        title: { type: String, required: true, trim: true },
        documentType: {
            type: String,
            enum: ["policy", "procedure", "work_instruction", "form", "template"],
            required: true,
        },
        documentNumber: { type: String, required: true, unique: true },
        version: { type: String, required: true, default: "1.0" },
        status: {
            type: String,
            enum: ["draft", "under_review", "approved", "obsolete"],
            default: "draft",
        },
        content: { type: String, required: true },
        fileUrl: { type: String },
        fileName: { type: String },
        fileSize: { type: Number },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        department: { type: String, required: true },
        effectiveDate: { type: Date, required: true },
        reviewDate: { type: Date },
        nextReviewDate: { type: Date, required: true },
        accessRights: {
            view: [{ type: Schema.Types.ObjectId, ref: "User" }],
            edit: [{ type: Schema.Types.ObjectId, ref: "User" }],
            approve: [{ type: Schema.Types.ObjectId, ref: "User" }],
        },
        changeHistory: [
            {
                version: { type: String, required: true },
                changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
                changeDate: { type: Date, default: Date.now },
                changeDescription: { type: String, required: true },
                changeType: {
                    type: String,
                    enum: ["created", "updated", "approved", "obsoleted"],
                    required: true,
                },
            },
        ],
        tags: [{ type: String, trim: true }],
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
QMSDocumentSchema.index({ documentNumber: 1 });
QMSDocumentSchema.index({ status: 1 });
QMSDocumentSchema.index({ documentType: 1 });
QMSDocumentSchema.index({ department: 1 });
QMSDocumentSchema.index({ createdBy: 1 });
QMSDocumentSchema.index({ nextReviewDate: 1 });

export const QMSDocument = mongoose.model<IQMSDocument>("QMSDocument", QMSDocumentSchema);
