import mongoose, { Document, Schema } from "mongoose";

export interface ICustomerFeedback extends Document {
    _id: mongoose.Types.ObjectId;
    feedbackNumber: string;
    type: "complaint" | "compliment" | "suggestion" | "inquiry";
    source: "email" | "phone" | "website" | "social_media" | "survey" | "other";
    customer: {
        name: string;
        email?: string;
        phone?: string;
        company?: string;
        customerType: "individual" | "corporate" | "supplier" | "partner";
    };
    subject: string;
    description: string;
    category: "product_quality" | "service_delivery" | "communication" | "pricing" | "support" | "other";
    priority: "low" | "medium" | "high" | "urgent";
    status: "received" | "acknowledged" | "investigating" | "resolved" | "closed" | "escalated";
    assignedTo?: mongoose.Types.ObjectId;
    receivedDate: Date;
    acknowledgedDate?: Date;
    resolvedDate?: Date;
    closureDate?: Date;
    affectedProducts?: string[];
    affectedServices?: string[];
    impact: {
        customerSatisfaction: "positive" | "neutral" | "negative" | "severe";
        businessImpact: "low" | "medium" | "high" | "critical";
        financialImpact?: number;
        reputationRisk: "low" | "medium" | "high" | "critical";
    };
    investigation: {
        investigator: mongoose.Types.ObjectId;
        startDate: Date;
        findings: string;
        rootCause?: string;
        evidence: string[];
        conclusion: string;
    };
    response: {
        responseProvided: string;
        responseMethod: "email" | "phone" | "meeting" | "letter" | "other";
        responseDate: Date;
        responseBy: mongoose.Types.ObjectId;
        customerSatisfied: boolean;
        customerFeedback?: string;
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
    linkedNCR?: mongoose.Types.ObjectId;
    linkedCAPA?: mongoose.Types.ObjectId;
    escalation: {
        escalated: boolean;
        escalatedTo: mongoose.Types.ObjectId;
        escalationDate: Date;
        escalationReason: string;
        resolution?: string;
    };
    followUp: {
        required: boolean;
        scheduledDate: Date;
        completedDate?: Date;
        method: "call" | "email" | "survey" | "meeting" | "other";
        responsible: mongoose.Types.ObjectId;
        outcome?: string;
    };
    attachments: Array<{
        fileName: string;
        fileUrl: string;
        uploadedBy: mongoose.Types.ObjectId;
        uploadedDate: Date;
    }>;
    tags: string[];
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}

const CustomerFeedbackSchema = new Schema<ICustomerFeedback>(
    {
        feedbackNumber: { type: String, required: true, unique: true },
        type: {
            type: String,
            enum: ["complaint", "compliment", "suggestion", "inquiry"],
            required: true,
        },
        source: {
            type: String,
            enum: ["email", "phone", "website", "social_media", "survey", "other"],
            required: true,
        },
        customer: {
            name: { type: String, required: true },
            email: { type: String },
            phone: { type: String },
            company: { type: String },
            customerType: {
                type: String,
                enum: ["individual", "corporate", "supplier", "partner"],
                required: true,
            },
        },
        subject: { type: String, required: true },
        description: { type: String, required: true },
        category: {
            type: String,
            enum: ["product_quality", "service_delivery", "communication", "pricing", "support", "other"],
            required: true,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },
        status: {
            type: String,
            enum: ["received", "acknowledged", "investigating", "resolved", "closed", "escalated"],
            default: "received",
        },
        assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
        receivedDate: { type: Date, default: Date.now },
        acknowledgedDate: { type: Date },
        resolvedDate: { type: Date },
        closureDate: { type: Date },
        affectedProducts: [{ type: String }],
        affectedServices: [{ type: String }],
        impact: {
            customerSatisfaction: {
                type: String,
                enum: ["positive", "neutral", "negative", "severe"],
                default: "neutral",
            },
            businessImpact: {
                type: String,
                enum: ["low", "medium", "high", "critical"],
                default: "medium",
            },
            financialImpact: { type: Number },
            reputationRisk: {
                type: String,
                enum: ["low", "medium", "high", "critical"],
                default: "medium",
            },
        },
        investigation: {
            investigator: { type: Schema.Types.ObjectId, ref: "User" },
            startDate: { type: Date },
            findings: { type: String },
            rootCause: { type: String },
            evidence: [{ type: String }],
            conclusion: { type: String },
        },
        response: {
            responseProvided: { type: String },
            responseMethod: {
                type: String,
                enum: ["email", "phone", "meeting", "letter", "other"],
            },
            responseDate: { type: Date },
            responseBy: { type: Schema.Types.ObjectId, ref: "User" },
            customerSatisfied: { type: Boolean },
            customerFeedback: { type: String },
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
        linkedNCR: { type: Schema.Types.ObjectId, ref: "NonConformance" },
        linkedCAPA: { type: Schema.Types.ObjectId, ref: "CAPA" },
        escalation: {
            escalated: { type: Boolean, default: false },
            escalatedTo: { type: Schema.Types.ObjectId, ref: "User" },
            escalationDate: { type: Date },
            escalationReason: { type: String },
            resolution: { type: String },
        },
        followUp: {
            required: { type: Boolean, default: false },
            scheduledDate: { type: Date },
            completedDate: { type: Date },
            method: {
                type: String,
                enum: ["call", "email", "survey", "meeting", "other"],
            },
            responsible: { type: Schema.Types.ObjectId, ref: "User" },
            outcome: { type: String },
        },
        attachments: [
            {
                fileName: { type: String, required: true },
                fileUrl: { type: String, required: true },
                uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
                uploadedDate: { type: Date, default: Date.now },
            },
        ],
        tags: [{ type: String, trim: true }],
        notes: { type: String },
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
CustomerFeedbackSchema.index({ feedbackNumber: 1 });
CustomerFeedbackSchema.index({ type: 1 });
CustomerFeedbackSchema.index({ status: 1 });
CustomerFeedbackSchema.index({ priority: 1 });
CustomerFeedbackSchema.index({ category: 1 });
CustomerFeedbackSchema.index({ assignedTo: 1 });
CustomerFeedbackSchema.index({ "customer.customerType": 1 });
CustomerFeedbackSchema.index({ receivedDate: -1 });
CustomerFeedbackSchema.index({ createdAt: -1 });

export const CustomerFeedback = mongoose.model<ICustomerFeedback>("CustomerFeedback", CustomerFeedbackSchema);
