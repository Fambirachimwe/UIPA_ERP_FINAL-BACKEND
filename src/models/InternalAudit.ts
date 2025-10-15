import mongoose, { Document, Schema } from "mongoose";

export interface IInternalAudit extends Document {
    _id: mongoose.Types.ObjectId;
    auditNumber: string;
    title: string;
    description: string;
    auditType: "internal" | "supplier" | "process" | "system" | "compliance";
    scope: string;
    objectives: string[];
    status: "planned" | "in_progress" | "completed" | "cancelled";
    plannedStartDate: Date;
    plannedEndDate: Date;
    actualStartDate?: Date;
    actualEndDate?: Date;
    leadAuditor: mongoose.Types.ObjectId;
    auditTeam: mongoose.Types.ObjectId[];
    auditee: {
        department: string;
        responsible: mongoose.Types.ObjectId;
        contactPerson: mongoose.Types.ObjectId;
    };
    auditCriteria: string[]; // ISO standards, procedures, etc.
    checklist: Array<{
        item: string;
        requirement: string;
        responsible: mongoose.Types.ObjectId;
        status: "not_applicable" | "conform" | "minor_nonconformity" | "major_nonconformity" | "observation" | "not_checked";
        evidence: string;
        notes?: string;
        checkedDate?: Date;
    }>;
    findings: Array<{
        findingNumber: string;
        description: string;
        criteria: string;
        severity: "observation" | "minor" | "major";
        category: "documentation" | "process" | "training" | "equipment" | "other";
        evidence: string;
        auditeeResponse?: string;
        correctiveAction?: {
            action: string;
            responsible: mongoose.Types.ObjectId;
            dueDate: Date;
            status: "pending" | "in_progress" | "completed" | "overdue";
        };
        linkedNCR?: mongoose.Types.ObjectId;
        linkedCAPA?: mongoose.Types.ObjectId;
    }>;
    auditReport: {
        summary: string;
        strengths: string[];
        opportunities: string[];
        recommendations: string[];
        conclusion: string;
        overallRating: "excellent" | "good" | "satisfactory" | "needs_improvement" | "poor";
    };
    followUp: {
        required: boolean;
        dueDate?: Date;
        responsible: mongoose.Types.ObjectId;
        status: "pending" | "in_progress" | "completed" | "overdue";
        verificationMethod?: string;
        closureDate?: Date;
    };
    attachments: Array<{
        fileName: string;
        fileUrl: string;
        uploadedBy: mongoose.Types.ObjectId;
        uploadedDate: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const InternalAuditSchema = new Schema<IInternalAudit>(
    {
        auditNumber: { type: String, required: true, unique: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        auditType: {
            type: String,
            enum: ["internal", "supplier", "process", "system", "compliance"],
            required: true,
        },
        scope: { type: String, required: true },
        objectives: [{ type: String }],
        status: {
            type: String,
            enum: ["planned", "in_progress", "completed", "cancelled"],
            default: "planned",
        },
        plannedStartDate: { type: Date, required: true },
        plannedEndDate: { type: Date, required: true },
        actualStartDate: { type: Date },
        actualEndDate: { type: Date },
        leadAuditor: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        auditTeam: [{ type: Schema.Types.ObjectId, ref: "User" }],
        auditee: {
            department: { type: String, required: true },
            responsible: { type: Schema.Types.ObjectId, ref: "User", required: true },
            contactPerson: { type: Schema.Types.ObjectId, ref: "User", required: true },
        },
        auditCriteria: [{ type: String }],
        checklist: [
            {
                item: { type: String, required: true },
                requirement: { type: String, required: true },
                responsible: { type: Schema.Types.ObjectId, ref: "User", required: true },
                status: {
                    type: String,
                    enum: ["not_applicable", "conform", "minor_nonconformity", "major_nonconformity", "observation", "not_checked"],
                    default: "not_checked",
                },
                evidence: { type: String },
                notes: { type: String },
                checkedDate: { type: Date },
            },
        ],
        findings: [
            {
                findingNumber: { type: String, required: true },
                description: { type: String, required: true },
                criteria: { type: String, required: true },
                severity: {
                    type: String,
                    enum: ["observation", "minor", "major"],
                    required: true,
                },
                category: {
                    type: String,
                    enum: ["documentation", "process", "training", "equipment", "other"],
                    required: true,
                },
                evidence: { type: String, required: true },
                auditeeResponse: { type: String },
                correctiveAction: {
                    action: { type: String },
                    responsible: { type: Schema.Types.ObjectId, ref: "User" },
                    dueDate: { type: Date },
                    status: {
                        type: String,
                        enum: ["pending", "in_progress", "completed", "overdue"],
                        default: "pending",
                    },
                },
                linkedNCR: { type: Schema.Types.ObjectId, ref: "NonConformance" },
                linkedCAPA: { type: Schema.Types.ObjectId, ref: "CAPA" },
            },
        ],
        auditReport: {
            summary: { type: String },
            strengths: [{ type: String }],
            opportunities: [{ type: String }],
            recommendations: [{ type: String }],
            conclusion: { type: String },
            overallRating: {
                type: String,
                enum: ["excellent", "good", "satisfactory", "needs_improvement", "poor"],
            },
        },
        followUp: {
            required: { type: Boolean, default: false },
            dueDate: { type: Date },
            responsible: { type: Schema.Types.ObjectId, ref: "User" },
            status: {
                type: String,
                enum: ["pending", "in_progress", "completed", "overdue"],
                default: "pending",
            },
            verificationMethod: { type: String },
            closureDate: { type: Date },
        },
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
InternalAuditSchema.index({ auditNumber: 1 });
InternalAuditSchema.index({ status: 1 });
InternalAuditSchema.index({ auditType: 1 });
InternalAuditSchema.index({ leadAuditor: 1 });
InternalAuditSchema.index({ "auditee.department": 1 });
InternalAuditSchema.index({ plannedStartDate: 1 });
InternalAuditSchema.index({ createdAt: -1 });

export const InternalAudit = mongoose.model<IInternalAudit>("InternalAudit", InternalAuditSchema);
