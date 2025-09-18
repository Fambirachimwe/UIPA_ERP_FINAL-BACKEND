import { Request, Response } from "express";
import { z } from "zod";
import { DocumentModel } from "../models/Document";
import { AuthenticatedRequest } from "../middleware/auth";
import { generateReferenceNumber, previewReferenceNumber } from "../services/referenceService";
import path from "path";
import fs from "fs";

const createDocumentSchema = z.object({
    type: z.enum(["report", "letter"]),
    subType: z.enum(["general", "project"]),
    title: z.string().min(1),
    description: z.string().optional(),
    department: z.string().min(1),
    projectId: z.string().optional(),
    projectNumber: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    expiryDate: z.string().datetime().optional(),
});

const updateDocumentSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    expiryDate: z.string().datetime().optional(),
    status: z.enum(["active", "archived", "deleted"]).optional(),
});

export async function listDocuments(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { type, subType, category, status = "active", search, page = 1, limit = 50 } = req.query;
    let query: any = { status };

    // Access control: Users see only their documents, admins see all
    if (req.user.role !== "admin") {
        query.author = req.user.id;
    }

    // Filters
    if (type) query.type = type;
    if (subType) query.subType = subType;
    if (category) query.category = category;

    // Text search
    if (search) {
        query.$text = { $search: search as string };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [documents, total] = await Promise.all([
        DocumentModel.find(query)
            .populate("author", "email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        DocumentModel.countDocuments(query),
    ]);

    return res.json({
        documents,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
        },
    });
}

export async function getDocument(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    let query: any = { _id: id, status: { $ne: "deleted" } };

    // Access control: Users can only view their documents, admins can view all
    if (req.user.role !== "admin") {
        query.author = req.user.id;
    }

    const document = await DocumentModel.findOne(query)
        .populate("author", "email")
        .populate("versions.uploadedBy", "email");

    if (!document) return res.status(404).json({ error: "Document not found" });
    return res.json(document);
}

export async function createDocument(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const parsed = createDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    // Check if file was uploaded
    if (!req.file) return res.status(400).json({ error: "Document file is required" });

    const { type, subType, title, description, department, projectId, projectNumber, tags, category, expiryDate } = parsed.data;

    try {
        // Generate reference number
        const referenceNumber = await generateReferenceNumber({
            type,
            subType,
            userId: req.user.id,
            projectNumber,
            projectId,
        });

        // File info
        const documentUrl = `/uploads/documents/${req.file.filename}`;
        const initialVersion = {
            version: "1.0",
            fileUrl: documentUrl,
            uploadedBy: req.user.id,
            uploadedAt: new Date(),
            isActive: true,
        };

        // Create document
        const document = await DocumentModel.create({
            referenceNumber,
            type,
            subType,
            title,
            description,
            author: req.user.id,
            department,
            projectId,
            documentUrl,
            currentVersion: "1.0",
            versions: [initialVersion],
            originalFileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            tags,
            category,
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        });

        const populatedDocument = await DocumentModel.findById(document._id).populate("author", "email");
        return res.status(201).json(populatedDocument);
    } catch (error: any) {
        // Clean up uploaded file if document creation fails
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        return res.status(400).json({ error: error.message });
    }
}

export async function updateDocument(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const parsed = updateDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    let query: any = { _id: id, status: { $ne: "deleted" } };

    // Access control: Users can only update their documents, admins can update all
    if (req.user.role !== "admin") {
        query.author = req.user.id;
    }

    const updateData: any = { ...parsed.data };
    if (updateData.expiryDate) {
        updateData.expiryDate = new Date(updateData.expiryDate);
    }

    const updated = await DocumentModel.findOneAndUpdate(query, updateData, { new: true })
        .populate("author", "email");

    if (!updated) return res.status(404).json({ error: "Document not found" });
    return res.json(updated);
}

export async function deleteDocument(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    let query: any = { _id: id, status: { $ne: "deleted" } };

    // Access control: Users can only delete their documents, admins can delete all
    if (req.user.role !== "admin") {
        query.author = req.user.id;
    }

    const updated = await DocumentModel.findOneAndUpdate(
        query,
        { status: "deleted" },
        { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Document not found" });
    return res.status(204).send();
}

export async function downloadDocument(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    let query: any = { _id: id, status: { $ne: "deleted" } };

    // Access control: Users can only download their documents, admins can download all
    if (req.user.role !== "admin") {
        query.author = req.user.id;
    }

    const document = await DocumentModel.findOne(query);
    if (!document) return res.status(404).json({ error: "Document not found" });

    const filePath = path.join(process.cwd(), "uploads", "documents", path.basename(document.documentUrl));

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on server" });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${document.originalFileName}"`);
    res.setHeader("Content-Type", document.mimeType);

    return res.sendFile(filePath);
}

export async function uploadNewVersion(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { changeNotes } = req.body;

    if (!req.file) return res.status(400).json({ error: "File is required" });

    let query: any = { _id: id, status: { $ne: "deleted" } };

    // Access control: Users can only update their documents, admins can update all
    if (req.user.role !== "admin") {
        query.author = req.user.id;
    }

    const document = await DocumentModel.findOne(query);
    if (!document) return res.status(404).json({ error: "Document not found" });

    try {
        // Generate new version number
        const currentVersionParts = document.currentVersion.split(".");
        const majorVersion = parseInt(currentVersionParts[0]);
        const minorVersion = parseInt(currentVersionParts[1] || "0");
        const newVersion = `${majorVersion}.${minorVersion + 1}`;

        // Mark previous versions as inactive
        document.versions.forEach(v => v.isActive = false);

        // Add new version
        const newVersionData = {
            version: newVersion,
            fileUrl: `/uploads/documents/${req.file.filename}`,
            uploadedBy: req.user.id,
            uploadedAt: new Date(),
            changeNotes,
            isActive: true,
        };

        document.versions.push(newVersionData as any);
        document.currentVersion = newVersion;
        document.documentUrl = newVersionData.fileUrl;
        document.originalFileName = req.file.originalname;
        document.fileSize = req.file.size;
        document.mimeType = req.file.mimetype;

        await document.save();

        const populatedDocument = await DocumentModel.findById(document._id)
            .populate("author", "email")
            .populate("versions.uploadedBy", "email");

        return res.json(populatedDocument);
    } catch (error: any) {
        // Clean up uploaded file if update fails
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        return res.status(400).json({ error: error.message });
    }
}

export async function previewReference(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { type, subType, projectNumber } = req.query;

    if (!type || !subType) {
        return res.status(400).json({ error: "Type and subType are required" });
    }

    try {
        const referenceNumber = await previewReferenceNumber({
            type: type as "report" | "letter",
            subType: subType as "general" | "project",
            userId: req.user.id,
            projectNumber: projectNumber as string,
        });

        return res.json({ referenceNumber });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
}

export async function getDocumentStats(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    let matchQuery: any = { status: "active" };

    // Access control: Users see stats for their documents only, admins see all
    if (req.user.role !== "admin") {
        matchQuery.author = req.user.id;
    }

    const stats = await DocumentModel.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalDocuments: { $sum: 1 },
                totalReports: { $sum: { $cond: [{ $eq: ["$type", "report"] }, 1, 0] } },
                totalLetters: { $sum: { $cond: [{ $eq: ["$type", "letter"] }, 1, 0] } },
                totalSize: { $sum: "$fileSize" },
                byType: {
                    $push: {
                        type: "$type",
                        subType: "$subType"
                    }
                }
            }
        }
    ]);

    const result = stats[0] || {
        totalDocuments: 0,
        totalReports: 0,
        totalLetters: 0,
        totalSize: 0
    };

    return res.json(result);
}
