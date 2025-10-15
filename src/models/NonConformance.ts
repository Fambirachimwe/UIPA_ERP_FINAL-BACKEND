import mongoose, { Document, Schema } from "mongoose";

export interface INonConformance extends Document {
    _id: mongoose.Types.ObjectId;
    ncrNumber: string;
    title: string;
    description: string;
    category: "product" | "process" | "system" | "supplier" | "customer" | "other";
    severity: "minor" | "major" | "critical";
    status: "open" | "investigation" | "corrective_action" | "verification" | "closed";
    source: "internal_audit" | "customer_complaint" | "supplier_issue" | "process_monitoring" | "other";
    location: string;
    department: string;
    reportedBy: mongoose.Types.ObjectId;
    assignedTo?: mongoose.Types.ObjectId;
    affectedProducts?: string[];
    affectedProcesses?: string[];
    customerImpact: {
        affected: boolean;
        description?: string;
        customerNotification?: boolean;
    };
    immediateActions: Array<{
        action: string;
        takenBy: mongoose.Types.ObjectId;
        takenDate: Date;
        effectiveness: "effective" | "partially_effective" | "ineffective";
    }>;
    rootCauseAnalysis: {
        method: "5_whys" | "fishbone" | "fault_tree" | "other";
        analysis: string;
        rootCause: string;
        analyzedBy: mongoose.Types.ObjectId;
        analysisDate: Date;
    };
    correctiveActions: Array<{
        action: string;
        responsible: mongoose.Types.ObjectId;
        dueDate: Date;
        completedDate?: Date;
        status: "pending" | "in_progress" | "completed" | "overdue";
        evidence?: string;
    }>;
    preventiveActions: Array<{
        action: string;
        responsible: mongoose.Types.ObjectId;
        dueDate: Date;
        completedDate?: Date;
        status: "pending" | "in_progress" | "completed" | "overdue";
        evidence?: string;
    }>;
    verification: {
        verifiedBy: mongoose.Types.ObjectId;
        verificationDate: Date;
        verificationMethod: string;
        effectiveness: "effective" | "partially_effective" | "ineffective";
        comments: string;
    };
    closure: {
        closedBy: mongoose.Types.ObjectId;
        closureDate: Date;
        closureReason: string;
        lessonsLearned: string;
    };
    relatedDocuments: mongoose.Types.ObjectId[];
    attachments: Array<{
        fileName: string;
        fileUrl: string;
        uploadedBy: mongoose.Types.ObjectId;
        uploadedDate: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const NonConformanceSchema = new Schema<INonConformance>(
    {
        ncrNumber: { type: String, required: true, unique: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        category: {
            type: String,
            enum: ["product", "process", "system", "supplier", "customer", "other"],
            required: true,
        },
        severity: {
            type: String,
            enum: ["minor", "major", "critical"],
            required: true,
        },
        status: {
            type: String,
            enum: ["open", "investigation", "corrective_action", "verification", "closed"],
            default: "open",
        },
        source: {
            type: String,
            enum: ["internal_audit", "customer_complaint", "supplier_issue", "process_monitoring", "other"],
            required: true,
        },
        location: { type: String, required: true },
        department: { type: String, required: true },
        reportedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        affectedProducts: [{ type: String }],
        affectedProcesses: [{ type: String }],
        customerImpact: {
            affected: { type: Boolean, default: false },
            description: { type: String },
            customerNotification: { type: Boolean, default: false },
        },
        immediateActions: [
            {
                action: { type: String, required: true },
                takenBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
                takenDate: { type: Date, required: true },
                effectiveness: {
                    type: String,
                    enum: ["effective", "partially_effective", "ineffective"],
                    required: true,
                },
            },
        ],
        rootCauseAnalysis: {
            method: {
                type: String,
                enum: ["5_whys", "fishbone", "fault_tree", "other"],
                required: true,
            },
            analysis: { type: String, required: true },
            rootCause: { type: String, required: true },
            analyzedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
            analysisDate: { type: Date, required: true },
        },
        correctiveActions: [
            {
                action: { type: String, required: true },
                responsible: { type: Schema.Types.ObjectId, ref: "User", required: true },
                dueDate: { type: Date, required: true },
                completedDate: { type: Date },
                status: {
                    type: String,
                    enum: ["pending", "in_progress", "completed", "overdue"],
                    default: "pending",
                },
                evidence: { type: String },
            },
        ],
        preventiveActions: [
            {
                action: { type: String, required: true },
                responsible: { type: Schema.Types.ObjectId, ref: "User", required: true },
                dueDate: { type: Date, required: true },
                completedDate: { type: Date },
                status: {
                    type: String,
                    enum: ["pending", "in_progress", "completed", "overdue"],
                    default: "pending",
                },
                evidence: { type: String },
            },
        ],
        verification: {
            verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
            verificationDate: { type: Date },
            verificationMethod: { type: String },
            effectiveness: {
                type: String,
                enum: ["effective", "partially_effective", "ineffective"],
            },
            comments: { type: String },
        },
        closure: {
            closedBy: { type: Schema.Types.ObjectId, ref: "User" },
            closureDate: { type: Date },
            closureReason: { type: String },
            lessonsLearned: { type: String },
        },
        relatedDocuments: [{ type: Schema.Types.ObjectId, ref: "QMSDocument" }],
        attachments: [
            {
                fileName: { type: String, required: true },
                fileUrl: { type: String, required: true },
                uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
                uploadedDate: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
NonConformanceSchema.index({ ncrNumber: 1 });
NonConformanceSchema.index({ status: 1 });
NonConformanceSchema.index({ category: 1 });
NonConformanceSchema.index({ severity: 1 });
NonConformanceSchema.index({ reportedBy: 1 });
NonConformanceSchema.index({ assignedTo: 1 });
NonConformanceSchema.index({ department: 1 });
NonConformanceSchema.index({ createdAt: -1 });

export const NonConformance = mongoose.model<INonConformance>("NonConformance", NonConformanceSchema);
