import mongoose, { Schema, Document, Model } from "mongoose";

export interface EmployeeDocument extends Document {
    userId?: mongoose.Types.ObjectId;
    name: string;
    email: string;
    phone?: string;
    department?: string;
    position?: string;
    hireDate?: Date;
    contractType?: string;
    manager?: mongoose.Types.ObjectId;
    salary?: number;
    documents?: {
        idCardUrl?: string;
        resumeUrl?: string;
        contracts?: { name: string, url: string }[];
        certificates?: { name: string, url: string }[];
    };
    createdAt: Date;
    updatedAt: Date;
}

const employeeSchema = new Schema<EmployeeDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, index: true },
        phone: { type: String },
        department: { type: String },
        position: { type: String },
        hireDate: { type: Date },
        contractType: { type: String },
        manager: { type: Schema.Types.ObjectId, ref: "Employee" },
        salary: { type: Number },
        documents: {
            idCardUrl: { type: String },
            resumeUrl: { type: String },
            contracts: [
                { name: String, url: String }
            ],
            certificates: [
                { name: String, url: String }
            ],
        },
    },
    { timestamps: true }
);

export const Employee: Model<EmployeeDocument> =
    mongoose.models.Employee || mongoose.model<EmployeeDocument>("Employee", employeeSchema);


