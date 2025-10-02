import mongoose, { Schema, Document, Model } from "mongoose";

export interface TransferFileDocument extends Document {
    transferId: mongoose.Types.ObjectId;
    originalName: string;
    relativePath?: string;
    storagePath: string; // Keep for backward compatibility, but will store Cloudinary URL
    cloudinaryPublicId?: string; // New field for Cloudinary public ID
    cloudinaryUrl?: string; // New field for Cloudinary secure URL
    mimeType: string;
    sizeBytes: number;
    drawingId?: string;
    version: number;
    checksum?: string;
    createdAt: Date;
    updatedAt: Date;
}

const transferFileSchema = new Schema<TransferFileDocument>(
    {
        transferId: { type: Schema.Types.ObjectId, ref: "Transfer", index: true, required: true },
        originalName: { type: String, required: true },
        relativePath: { type: String, default: "" },
        storagePath: { type: String, required: true }, // Will store Cloudinary URL
        cloudinaryPublicId: { type: String }, // Cloudinary public ID
        cloudinaryUrl: { type: String }, // Cloudinary secure URL
        mimeType: { type: String, required: true },
        sizeBytes: { type: Number, required: true },
        drawingId: { type: String },
        version: { type: Number, required: true, min: 1 },
        checksum: { type: String },
    },
    { timestamps: true }
);

transferFileSchema.index({ transferId: 1, relativePath: 1, originalName: 1, version: -1 });

export const TransferFile: Model<TransferFileDocument> =
    mongoose.models.TransferFile || mongoose.model<TransferFileDocument>("TransferFile", transferFileSchema);


