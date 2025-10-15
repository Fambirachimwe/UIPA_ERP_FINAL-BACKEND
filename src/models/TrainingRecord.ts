import mongoose, { Document, Schema } from "mongoose";

export interface ITrainingRecord extends Document {
    _id: mongoose.Types.ObjectId;
    trainingNumber: string;
    title: string;
    description: string;
    trainingType: "internal" | "external" | "online" | "on_the_job" | "certification";
    category: "safety" | "quality" | "technical" | "soft_skills" | "compliance" | "other";
    provider: string;
    instructor?: mongoose.Types.ObjectId;
    location: string;
    scheduledDate: Date;
    duration: number; // in hours
    maxParticipants: number;
    status: "scheduled" | "in_progress" | "completed" | "cancelled";
    attendees: Array<{
        employee: mongoose.Types.ObjectId;
        registrationDate: Date;
        attendanceStatus: "registered" | "attended" | "absent" | "partially_attended";
        completionStatus: "not_started" | "in_progress" | "completed" | "failed";
        score?: number;
        certificateUrl?: string;
        validUntil?: Date;
        notes?: string;
    }>;
    materials: Array<{
        fileName: string;
        fileUrl: string;
        type: "presentation" | "handout" | "manual" | "video" | "other";
        uploadedBy: mongoose.Types.ObjectId;
        uploadedDate: Date;
    }>;
    assessment: {
        required: boolean;
        type: "quiz" | "practical" | "presentation" | "written" | "other";
        passingScore?: number;
        questions?: Array<{
            question: string;
            options?: string[];
            correctAnswer?: string;
            points: number;
        }>;
    };
    evaluation: {
        overallRating: number; // 1-5 scale
        effectiveness: number; // 1-5 scale
        instructorRating: number; // 1-5 scale
        materialRating: number; // 1-5 scale
        venueRating: number; // 1-5 scale
        comments: string;
        improvements: string;
        evaluatedBy: mongoose.Types.ObjectId;
        evaluationDate: Date;
    };
    followUp: {
        required: boolean;
        interval: number; // in months
        method: "survey" | "assessment" | "observation" | "other";
        responsible: mongoose.Types.ObjectId;
        nextDue?: Date;
    };
    cost: {
        total: number;
        breakdown: {
            instructor?: number;
            venue?: number;
            materials?: number;
            travel?: number;
            other?: number;
        };
    };
    objectives: string[];
    outcomes: string[];
    attachments: Array<{
        fileName: string;
        fileUrl: string;
        uploadedBy: mongoose.Types.ObjectId;
        uploadedDate: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const TrainingRecordSchema = new Schema<ITrainingRecord>(
    {
        trainingNumber: { type: String, required: true, unique: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        trainingType: {
            type: String,
            enum: ["internal", "external", "online", "on_the_job", "certification"],
            required: true,
        },
        category: {
            type: String,
            enum: ["safety", "quality", "technical", "soft_skills", "compliance", "other"],
            required: true,
        },
        provider: { type: String, required: true },
        instructor: { type: Schema.Types.ObjectId, ref: "User" },
        location: { type: String, required: true },
        scheduledDate: { type: Date, required: true },
        duration: { type: Number, required: true },
        maxParticipants: { type: Number, required: true },
        status: {
            type: String,
            enum: ["scheduled", "in_progress", "completed", "cancelled"],
            default: "scheduled",
        },
        attendees: [
            {
                employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
                registrationDate: { type: Date, default: Date.now },
                attendanceStatus: {
                    type: String,
                    enum: ["registered", "attended", "absent", "partially_attended"],
                    default: "registered",
                },
                completionStatus: {
                    type: String,
                    enum: ["not_started", "in_progress", "completed", "failed"],
                    default: "not_started",
                },
                score: { type: Number },
                certificateUrl: { type: String },
                validUntil: { type: Date },
                notes: { type: String },
            },
        ],
        materials: [
            {
                fileName: { type: String, required: true },
                fileUrl: { type: String, required: true },
                type: {
                    type: String,
                    enum: ["presentation", "handout", "manual", "video", "other"],
                    required: true,
                },
                uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
                uploadedDate: { type: Date, default: Date.now },
            },
        ],
        assessment: {
            required: { type: Boolean, default: false },
            type: {
                type: String,
                enum: ["quiz", "practical", "presentation", "written", "other"],
            },
            passingScore: { type: Number },
            questions: [
                {
                    question: { type: String, required: true },
                    options: [{ type: String }],
                    correctAnswer: { type: String },
                    points: { type: Number, required: true },
                },
            ],
        },
        evaluation: {
            overallRating: { type: Number, min: 1, max: 5 },
            effectiveness: { type: Number, min: 1, max: 5 },
            instructorRating: { type: Number, min: 1, max: 5 },
            materialRating: { type: Number, min: 1, max: 5 },
            venueRating: { type: Number, min: 1, max: 5 },
            comments: { type: String },
            improvements: { type: String },
            evaluatedBy: { type: Schema.Types.ObjectId, ref: "User" },
            evaluationDate: { type: Date },
        },
        followUp: {
            required: { type: Boolean, default: false },
            interval: { type: Number },
            method: {
                type: String,
                enum: ["survey", "assessment", "observation", "other"],
            },
            responsible: { type: Schema.Types.ObjectId, ref: "User" },
            nextDue: { type: Date },
        },
        cost: {
            total: { type: Number, default: 0 },
            breakdown: {
                instructor: { type: Number },
                venue: { type: Number },
                materials: { type: Number },
                travel: { type: Number },
                other: { type: Number },
            },
        },
        objectives: [{ type: String }],
        outcomes: [{ type: String }],
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
TrainingRecordSchema.index({ trainingNumber: 1 });
TrainingRecordSchema.index({ status: 1 });
TrainingRecordSchema.index({ trainingType: 1 });
TrainingRecordSchema.index({ category: 1 });
TrainingRecordSchema.index({ scheduledDate: 1 });
TrainingRecordSchema.index({ instructor: 1 });
TrainingRecordSchema.index({ "attendees.employee": 1 });
TrainingRecordSchema.index({ createdAt: -1 });

export const TrainingRecord = mongoose.model<ITrainingRecord>("TrainingRecord", TrainingRecordSchema);
