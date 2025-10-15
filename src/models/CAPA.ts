import mongoose, { Document, Schema } from "mongoose";

export interface ICAPA extends Document {
    _id: mongoose.Types.ObjectId;
    capaNumber: string;
    title: string;
    description: string;
    type: "corrective" | "preventive";
    source: "ncr" | "audit" | "customer_complaint" | "management_review" | "other";
    sourceReference?: string; // NCR number, audit ID, etc.
    priority: "low" | "medium" | "high" | "critical";
    status: "initiated" | "investigation" | "planning" | "implementation" | "verification" | "closed";
    initiatedBy: mongoose.Types.ObjectId;
    assignedTo: mongoose.Types.ObjectId;
    teamMembers: mongoose.Types.ObjectId[];
    problemStatement: string;
    scope: string;
    impactAssessment: {
        affectedProcesses: string[];
        affectedProducts: string[];
        affectedCustomers: string[];
        businessImpact: "low" | "medium" | "high" | "critical";
        description: string;
    };
    rootCauseAnalysis: {
        method: "5_whys" | "fishbone" | "fault_tree" | "pareto" | "other";
        analysis: string;
        identifiedRootCauses: string[];
        verifiedBy: mongoose.Types.ObjectId;
        verificationDate: Date;
    };
    actionPlan: Array<{
        action: string;
        responsible: mongoose.Types.ObjectId;
        dueDate: Date;
        completedDate?: Date;
        status: "pending" | "in_progress" | "completed" | "overdue";
        resources: string[];
        budget?: number;
        evidence?: string;
        effectiveness?: "effective" | "partially_effective" | "ineffective";
    }>;
    effectivenessVerification: {
        method: string;
        verifiedBy: mongoose.Types.ObjectId;
        verificationDate: Date;
        results: string;
        effectiveness: "effective" | "partially_effective" | "ineffective";
        followUpActions?: string;
    };
    preventiveMeasures: Array<{
        measure: string;
        responsible: mongoose.Types.ObjectId;
        dueDate: Date;
        completedDate?: Date;
        status: "pending" | "in_progress" | "completed" | "overdue";
        monitoringFrequency: string;
    }>;
    costBenefitAnalysis: {
        implementationCost: number;
        benefits: string;
        roi?: number;
        paybackPeriod?: string;
    };
    lessonsLearned: string;
    bestPractices: string[];
    relatedDocuments: mongoose.Types.ObjectId[];
    attachments: Array<{
        fileName: string;
        fileUrl: string;
        uploadedBy: mongoose.Types.ObjectId;
        uploadedDate: Date;
    }>;
    timeline: Array<{
        milestone: string;
        plannedDate: Date;
        actualDate?: Date;
        status: "pending" | "completed" | "overdue";
        notes?: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const CAPASchema = new Schema<ICAPA>(
    {
        capaNumber: { type: String, required: true, unique: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        type: {
            type: String,
            enum: ["corrective", "preventive"],
            required: true,
        },
        source: {
            type: String,
            enum: ["ncr", "audit", "customer_complaint", "management_review", "other"],
            required: true,
        },
        sourceReference: { type: String },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            required: true,
        },
        status: {
            type: String,
            enum: ["initiated", "investigation", "planning", "implementation", "verification", "closed"],
            default: "initiated",
        },
        initiatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        teamMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
        problemStatement: { type: String, required: true },
        scope: { type: String, required: true },
        impactAssessment: {
            affectedProcesses: [{ type: String }],
            affectedProducts: [{ type: String }],
            affectedCustomers: [{ type: String }],
            businessImpact: {
                type: String,
                enum: ["low", "medium", "high", "critical"],
                required: true,
            },
            description: { type: String, required: true },
        },
        rootCauseAnalysis: {
            method: {
                type: String,
                enum: ["5_whys", "fishbone", "fault_tree", "pareto", "other"],
                required: true,
            },
            analysis: { type: String, required: true },
            identifiedRootCauses: [{ type: String }],
            verifiedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
            verificationDate: { type: Date, required: true },
        },
        actionPlan: [
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
                resources: [{ type: String }],
                budget: { type: Number },
                evidence: { type: String },
                effectiveness: {
                    type: String,
                    enum: ["effective", "partially_effective", "ineffective"],
                },
            },
        ],
        effectivenessVerification: {
            method: { type: String },
            verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
            verificationDate: { type: Date },
            results: { type: String },
            effectiveness: {
                type: String,
                enum: ["effective", "partially_effective", "ineffective"],
            },
            followUpActions: { type: String },
        },
        preventiveMeasures: [
            {
                measure: { type: String, required: true },
                responsible: { type: Schema.Types.ObjectId, ref: "User", required: true },
                dueDate: { type: Date, required: true },
                completedDate: { type: Date },
                status: {
                    type: String,
                    enum: ["pending", "in_progress", "completed", "overdue"],
                    default: "pending",
                },
                monitoringFrequency: { type: String },
            },
        ],
        costBenefitAnalysis: {
            implementationCost: { type: Number, default: 0 },
            benefits: { type: String },
            roi: { type: Number },
            paybackPeriod: { type: String },
        },
        lessonsLearned: { type: String },
        bestPractices: [{ type: String }],
        relatedDocuments: [{ type: Schema.Types.ObjectId, ref: "QMSDocument" }],
        attachments: [
            {
                fileName: { type: String, required: true },
                fileUrl: { type: String, required: true },
                uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
                uploadedDate: { type: Date, default: Date.now },
            },
        ],
        timeline: [
            {
                milestone: { type: String, required: true },
                plannedDate: { type: Date, required: true },
                actualDate: { type: Date },
                status: {
                    type: String,
                    enum: ["pending", "completed", "overdue"],
                    default: "pending",
                },
                notes: { type: String },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
CAPASchema.index({ capaNumber: 1 });
CAPASchema.index({ status: 1 });
CAPASchema.index({ type: 1 });
CAPASchema.index({ priority: 1 });
CAPASchema.index({ source: 1 });
CAPASchema.index({ initiatedBy: 1 });
CAPASchema.index({ assignedTo: 1 });
CAPASchema.index({ createdAt: -1 });

export const CAPA = mongoose.model<ICAPA>("CAPA", CAPASchema);
