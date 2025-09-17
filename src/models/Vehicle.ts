import mongoose, { Schema, Document, Model } from "mongoose";

export interface VehicleDocument extends Document {
    name: string;
    registrationNumber: string;
    make?: string;
    model?: string;
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
    createdAt: Date;
    updatedAt: Date;
}

const vehicleSchema = new Schema<VehicleDocument>(
    {
        name: { type: String, required: true },
        registrationNumber: { type: String, required: true, unique: true, index: true },
        make: { type: String },
        model: { type: String },
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
    },
    { timestamps: true }
);

export const Vehicle: Model<VehicleDocument> =
    mongoose.models.Vehicle || mongoose.model<VehicleDocument>("Vehicle", vehicleSchema);


