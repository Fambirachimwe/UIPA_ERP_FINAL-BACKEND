import mongoose, { Schema, Document, Model } from "mongoose";

export interface TokenDocument extends Document {
    userId: mongoose.Types.ObjectId;
    type: "access" | "refresh";
    token: string;
    expiresAt: Date;
}

const tokenSchema = new Schema<TokenDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        type: { type: String, enum: ["access", "refresh"], required: true },
        token: { type: String, required: true, index: true },
        expiresAt: { type: Date, required: true, index: true },
    },
    { timestamps: true }
);

tokenSchema.index({ userId: 1, type: 1 });

export const Token: Model<TokenDocument> = mongoose.models.Token || mongoose.model<TokenDocument>("Token", tokenSchema);


