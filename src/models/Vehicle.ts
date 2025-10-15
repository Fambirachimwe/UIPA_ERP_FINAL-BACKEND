import mongoose, { Schema, Document, Model } from "mongoose";

export interface VehicleDocument extends Document {
    name: string;
    registrationNumber: string;
    make?: string;
    vehicleModel?: string; // Renamed to avoid conflict with Document.model
    year?: number;
    mileage?: number;
    fuelType?: string;
    assignedTo?: mongoose.Types.ObjectId; // Employee
    project?: string;
    status?: "active" | "in maintenance" | "retired";
    insurance?: {
        provider?: string;
        policyNumber?: string;
        expiryDate?: Date;
    };
    serviceSchedule?: Array<{ serviceDate: Date; notes?: string }>;
    documents?: Array<{
        type?: string;
        name: string;
        url: string;
        publicId?: string;
        originalName: string;
        size: number;
        mimeType: string;
        uploadedBy: mongoose.Types.ObjectId;
        uploadedAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const vehicleSchema = new Schema<VehicleDocument>(
    {
        name: { type: String, required: true },
        registrationNumber: { type: String, required: true, unique: true, index: true },
        make: { type: String },
        vehicleModel: { type: String },
        year: { type: Number },
        mileage: { type: Number },
        fuelType: { type: String },
        assignedTo: { type: Schema.Types.ObjectId, ref: "Employee" },
        project: { type: String },
        status: { type: String, enum: ["active", "in maintenance", "retired"], default: "active" },
        insurance: {
            provider: { type: String },
            policyNumber: { type: String },
            expiryDate: { type: Date },
        },
        serviceSchedule: [
            {
                serviceDate: { type: Date, required: true },
                notes: { type: String },
            },
        ],
        documents: [
            {
                type: { type: String, default: 'general' },
                name: { type: String, required: true },
                url: { type: String, required: true },
                publicId: { type: String },
                originalName: { type: String, required: true },
                size: { type: Number, required: true },
                mimeType: { type: String, required: true },
                uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

export const Vehicle: Model<VehicleDocument> =
    mongoose.models.Vehicle || mongoose.model<VehicleDocument>("Vehicle", vehicleSchema);


