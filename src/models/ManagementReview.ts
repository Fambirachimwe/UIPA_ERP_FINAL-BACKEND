import mongoose, { Document, Schema } from "mongoose";

export interface IManagementReview extends Document {
    _id: mongoose.Types.ObjectId;
    reviewNumber: string;
    title: string;
    reviewType: "annual" | "quarterly" | "monthly" | "ad_hoc";
    reviewDate: Date;
    attendees: Array<{
        user: mongoose.Types.ObjectId;
        role: string;
        attendanceStatus: "present" | "absent" | "excused";
    }>;
    agenda: Array<{
        topic: string;
        presenter?: mongoose.Types.ObjectId;
        duration: number; // in minutes
        status: "scheduled" | "completed" | "postponed" | "cancelled";
        notes?: string;
    }>;
    kpiReview: Array<{
        kpi: string;
        target: number;
        actual: number;
        unit: string;
        trend: "improving" | "stable" | "declining";
        analysis: string;
        actions?: string;
    }>;
    auditResults: Array<{
        auditId: mongoose.Types.ObjectId;
        summary: string;
        findings: number;
        nonConformities: number;
        status: "open" | "closed";
    }>;
    customerFeedback: {
        complaints: {
            total: number;
            resolved: number;
            pending: number;
            trend: "improving" | "stable" | "declining";
        };
        satisfaction: {
            score: number;
            target: number;
            trend: "improving" | "stable" | "declining";
        };
        keyIssues: string[];
    };
    resourceReview: {
        humanResources: {
            adequacy: "adequate" | "inadequate" | "excessive";
            needs: string[];
            training: string[];
        };
        infrastructure: {
            adequacy: "adequate" | "inadequate" | "excessive";
            needs: string[];
            maintenance: string[];
        };
        financial: {
            budget: number;
            actual: number;
            variance: number;
            needs: string[];
        };
    };
    processPerformance: Array<{
        process: string;
        effectiveness: "effective" | "partially_effective" | "ineffective";
        efficiency: "efficient" | "partially_efficient" | "inefficient";
        issues: string[];
        improvements: string[];
    }>;
    risksOpportunities: Array<{
        type: "risk" | "opportunity";
        description: string;
        impact: "low" | "medium" | "high" | "critical";
        probability: "low" | "medium" | "high";
        mitigation?: string;
        owner: mongoose.Types.ObjectId;
        status: "identified" | "assessed" | "mitigated" | "closed";
    }>;
    decisions: Array<{
        decision: string;
        rationale: string;
        responsible: mongoose.Types.ObjectId;
        dueDate: Date;
        status: "pending" | "in_progress" | "completed" | "overdue";
    }>;
    actionItems: Array<{
        action: string;
        responsible: mongoose.Types.ObjectId;
        dueDate: Date;
        completedDate?: Date;
        status: "pending" | "in_progress" | "completed" | "overdue";
        priority: "low" | "medium" | "high" | "critical";
        notes?: string;
    }>;
    nextReview: {
        scheduledDate: Date;
        agenda: string[];
        preparation: string[];
    };
    meetingMinutes: {
        content: string;
        recordedBy: mongoose.Types.ObjectId;
        approvedBy: mongoose.Types.ObjectId;
        approvalDate: Date;
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

const ManagementReviewSchema = new Schema<IManagementReview>(
    {
        reviewNumber: { type: String, required: true, unique: true },
        title: { type: String, required: true, trim: true },
        reviewType: {
            type: String,
            enum: ["annual", "quarterly", "monthly", "ad_hoc"],
            required: true,
        },
        reviewDate: { type: Date, required: true },
        attendees: [
            {
                user: { type: Schema.Types.ObjectId, ref: "User", required: true },
                role: { type: String, required: true },
                attendanceStatus: {
                    type: String,
                    enum: ["present", "absent", "excused"],
                    default: "present",
                },
            },
        ],
        agenda: [
            {
                topic: { type: String, required: true },
                presenter: { type: Schema.Types.ObjectId, ref: "User" },
                duration: { type: Number, required: true },
                status: {
                    type: String,
                    enum: ["scheduled", "completed", "postponed", "cancelled"],
                    default: "scheduled",
                },
                notes: { type: String },
            },
        ],
        kpiReview: [
            {
                kpi: { type: String, required: true },
                target: { type: Number, required: true },
                actual: { type: Number, required: true },
                unit: { type: String, required: true },
                trend: {
                    type: String,
                    enum: ["improving", "stable", "declining"],
                    required: true,
                },
                analysis: { type: String, required: true },
                actions: { type: String },
            },
        ],
        auditResults: [
            {
                auditId: { type: Schema.Types.ObjectId, ref: "InternalAudit", required: true },
                summary: { type: String, required: true },
                findings: { type: Number, required: true },
                nonConformities: { type: Number, required: true },
                status: {
                    type: String,
                    enum: ["open", "closed"],
                    default: "open",
                },
            },
        ],
        customerFeedback: {
            complaints: {
                total: { type: Number, default: 0 },
                resolved: { type: Number, default: 0 },
                pending: { type: Number, default: 0 },
                trend: {
                    type: String,
                    enum: ["improving", "stable", "declining"],
                    default: "stable",
                },
            },
            satisfaction: {
                score: { type: Number, required: true },
                target: { type: Number, required: true },
                trend: {
                    type: String,
                    enum: ["improving", "stable", "declining"],
                    required: true,
                },
            },
            keyIssues: [{ type: String }],
        },
        resourceReview: {
            humanResources: {
                adequacy: {
                    type: String,
                    enum: ["adequate", "inadequate", "excessive"],
                    required: true,
                },
                needs: [{ type: String }],
                training: [{ type: String }],
            },
            infrastructure: {
                adequacy: {
                    type: String,
                    enum: ["adequate", "inadequate", "excessive"],
                    required: true,
                },
                needs: [{ type: String }],
                maintenance: [{ type: String }],
            },
            financial: {
                budget: { type: Number, required: true },
                actual: { type: Number, required: true },
                variance: { type: Number, required: true },
                needs: [{ type: String }],
            },
        },
        processPerformance: [
            {
                process: { type: String, required: true },
                effectiveness: {
                    type: String,
                    enum: ["effective", "partially_effective", "ineffective"],
                    required: true,
                },
                efficiency: {
                    type: String,
                    enum: ["efficient", "partially_efficient", "inefficient"],
                    required: true,
                },
                issues: [{ type: String }],
                improvements: [{ type: String }],
            },
        ],
        risksOpportunities: [
            {
                type: {
                    type: String,
                    enum: ["risk", "opportunity"],
                    required: true,
                },
                description: { type: String, required: true },
                impact: {
                    type: String,
                    enum: ["low", "medium", "high", "critical"],
                    required: true,
                },
                probability: {
                    type: String,
                    enum: ["low", "medium", "high"],
                    required: true,
                },
                mitigation: { type: String },
                owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
                status: {
                    type: String,
                    enum: ["identified", "assessed", "mitigated", "closed"],
                    default: "identified",
                },
            },
        ],
        decisions: [
            {
                decision: { type: String, required: true },
                rationale: { type: String, required: true },
                responsible: { type: Schema.Types.ObjectId, ref: "User", required: true },
                dueDate: { type: Date, required: true },
                status: {
                    type: String,
                    enum: ["pending", "in_progress", "completed", "overdue"],
                    default: "pending",
                },
            },
        ],
        actionItems: [
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
                priority: {
                    type: String,
                    enum: ["low", "medium", "high", "critical"],
                    default: "medium",
                },
                notes: { type: String },
            },
        ],
        nextReview: {
            scheduledDate: { type: Date, required: true },
            agenda: [{ type: String }],
            preparation: [{ type: String }],
        },
        meetingMinutes: {
            content: { type: String },
            recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
            approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
            approvalDate: { type: Date },
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
ManagementReviewSchema.index({ reviewNumber: 1 });
ManagementReviewSchema.index({ reviewType: 1 });
ManagementReviewSchema.index({ reviewDate: 1 });
ManagementReviewSchema.index({ createdAt: -1 });

export const ManagementReview = mongoose.model<IManagementReview>("ManagementReview", ManagementReviewSchema);
