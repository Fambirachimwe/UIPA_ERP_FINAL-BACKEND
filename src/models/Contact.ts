import mongoose, { Schema, Document, Model } from "mongoose";

export interface ContactDocument extends Document {
    name: string;
    email?: string;
    phone?: string;
    category: "supplier" | "service provider" | "customer" | "other";
    companyName?: string;
    address?: string;
    notes?: string;
    preferredContactMethod?: string;
    linkedEmployee?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const contactSchema = new Schema<ContactDocument>(
    {
        name: { type: String, required: true, index: true },
        email: { type: String, index: true },
        phone: { type: String, index: true },
        category: {
            type: String,
            required: true,
            enum: ["supplier", "service provider", "customer", "other"],
            index: true,
        },
        companyName: { type: String, index: true },
        address: { type: String },
        notes: { type: String },
        preferredContactMethod: { type: String },
        linkedEmployee: { type: Schema.Types.ObjectId, ref: "Employee" },
    },
    { timestamps: true }
);

// Text search index for searchable fields
contactSchema.index({
    name: "text",
    email: "text",
    phone: "text",
    companyName: "text",
});

export const Contact: Model<ContactDocument> =
    mongoose.models.Contact || mongoose.model<ContactDocument>("Contact", contactSchema);
