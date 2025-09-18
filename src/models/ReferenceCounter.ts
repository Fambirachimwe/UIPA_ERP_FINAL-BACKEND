import mongoose, { Schema, Document, Model } from "mongoose";

export interface ReferenceCounterDocument extends Document {
    type: string; // "RPT-IT", "RPT-PRJ001", "L-JD-IT", etc.
    year?: number;
    lastNumber: number;
    createdAt: Date;
    updatedAt: Date;
}

const referenceCounterSchema = new Schema<ReferenceCounterDocument>(
    {
        type: { type: String, required: true, unique: true, index: true },
        year: { type: Number, index: true },
        lastNumber: { type: Number, required: true, default: 0 },
    },
    { timestamps: true }
);

// Compound index for efficient lookups
referenceCounterSchema.index({ type: 1, year: 1 }, { unique: true });

export const ReferenceCounter: Model<ReferenceCounterDocument> =
    mongoose.models.ReferenceCounter || mongoose.model<ReferenceCounterDocument>("ReferenceCounter", referenceCounterSchema);
