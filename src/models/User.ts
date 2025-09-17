import mongoose, { Schema, Document, Model } from "mongoose";

export interface UserAttributes {
    department?: string;
    employee_id?: string;
    approval_level?: string;
}

export interface UserDocument extends Document {
    email: string;
    passwordHash: string;
    role: "employee" | "approver" | "admin";
    attributes: UserAttributes;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
    {
        email: { type: String, required: true, unique: true, index: true },
        passwordHash: { type: String, required: true },
        role: { type: String, required: true, enum: ["employee", "approver", "admin"], default: "employee" },
        attributes: {
            department: { type: String },
            employee_id: { type: String, index: true, unique: false },
            approval_level: { type: String },
        },
    },
    { timestamps: true }
);

export const User: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>("User", userSchema);


