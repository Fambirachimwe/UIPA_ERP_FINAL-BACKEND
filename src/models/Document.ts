import mongoose, { Schema, Document, Model } from "mongoose";

export interface DocumentVersion {
    version: string;
    fileUrl: string; // Will store Cloudinary URL
    cloudinaryPublicId?: string; // Cloudinary public ID
    cloudinaryUrl?: string; // Cloudinary secure URL
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt: Date;
    changeNotes?: string;
    isActive: boolean;
}

export interface DocumentDocument extends Document {
    referenceNumber: string;
    type: "report" | "letter";
    subType: "general" | "project";

    // Metadata
    title: string;
    description?: string;
    author: mongoose.Types.ObjectId;
    department: string;
    projectId?: string;

    // File info
    documentUrl: string; // Main document URL (will store Cloudinary URL)
    cloudinaryPublicId?: string; // Cloudinary public ID for main document
    cloudinaryUrl?: string; // Cloudinary secure URL for main document
    currentVersion: string;
    versions: DocumentVersion[];
    originalFileName: string;
    fileSize: number;
    mimeType: string;

    // Organization
    tags: string[];
    category: string;

    // Dates
    createdAt: Date;
    updatedAt: Date;
    expiryDate?: Date;

    // Status
    status: "active" | "archived" | "deleted";
}

const documentVersionSchema = new Schema({
    version: { type: String, required: true },
    fileUrl: { type: String, required: true }, // Will store Cloudinary URL
    cloudinaryPublicId: { type: String }, // Cloudinary public ID
    cloudinaryUrl: { type: String }, // Cloudinary secure URL
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now },
    changeNotes: { type: String },
    isActive: { type: Boolean, default: true },
});

const documentSchema = new Schema<DocumentDocument>(
    {
        referenceNumber: { type: String, required: true, unique: true, index: true },
        type: { type: String, enum: ["report", "letter"], required: true, index: true },
        subType: { type: String, enum: ["general", "project"], required: true, index: true },

        // Metadata
        title: { type: String, required: true, index: true },
        description: { type: String },
        author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        department: { type: String, required: true, index: true },
        projectId: { type: String, ref: "Project" },

        // File info
        documentUrl: { type: String, required: true }, // Will store Cloudinary URL
        cloudinaryPublicId: { type: String }, // Cloudinary public ID for main document
        cloudinaryUrl: { type: String }, // Cloudinary secure URL for main document
        currentVersion: { type: String, default: "1.0" },
        versions: [documentVersionSchema],
        originalFileName: { type: String, required: true },
        fileSize: { type: Number, required: true },
        mimeType: { type: String, required: true },

        // Organization
        tags: [{ type: String, index: true }],
        category: { type: String, index: true },

        // Dates
        expiryDate: { type: Date },

        // Status
        status: { type: String, enum: ["active", "archived", "deleted"], default: "active", index: true },
    },
    { timestamps: true }
);

// Compound indexes for efficient queries
documentSchema.index({ author: 1, type: 1, createdAt: -1 });
documentSchema.index({ department: 1, type: 1, createdAt: -1 });
documentSchema.index({ referenceNumber: 1, status: 1 });

// Text search index
documentSchema.index({
    title: "text",
    description: "text",
    tags: "text",
    referenceNumber: "text"
});

export const DocumentModel: Model<DocumentDocument> =
    mongoose.models.Document || mongoose.model<DocumentDocument>("Document", documentSchema);
