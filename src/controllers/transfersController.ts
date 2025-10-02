import { Response } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs";
import { AuthenticatedRequest } from "../middleware/auth";
import { Transfer } from "../models/Transfer";
import { TransferFile } from "../models/TransferFile";
import { TransferAccessLog } from "../models/TransferAccessLog";
import { signTransferAccessToken, verifyTransferAccessToken } from "../services/tokenService";
import archiver from "archiver";

export async function createTransfer(req: AuthenticatedRequest, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { title, description, password, expiresAt, maxDownloads } = req.body as any;
        if (!title) return res.status(400).json({ error: "title is required" });

        const shortCode = nanoid(10);
        const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

        const transfer = await Transfer.create({
            shortCode,
            title,
            description,
            passwordHash,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            maxDownloads: maxDownloads ? Number(maxDownloads) : undefined,
            files: [],
            createdBy: userId as any,
        });

        const uploaded = (req.files as Express.Multer.File[]) || [];
        const pathsField = (req.body as any).paths;
        const paths: string[] = Array.isArray(pathsField)
            ? pathsField
            : (typeof pathsField === 'string' ? [pathsField] : []);
        const fileDocs = [] as any[];
        for (let i = 0; i < uploaded.length; i++) {
            const f = uploaded[i];
            fileDocs.push(await TransferFile.create({
                transferId: transfer._id,
                originalName: f.originalname,
                relativePath: paths[i] || (f as any).relativePath || "",
                storagePath: f.cloudinary?.secure_url || f.path, // Use Cloudinary URL if available
                cloudinaryPublicId: f.cloudinary?.public_id,
                cloudinaryUrl: f.cloudinary?.secure_url,
                mimeType: f.mimetype,
                sizeBytes: f.size,
                version: 1,
            }));
        }

        if (fileDocs.length) {
            transfer.files = fileDocs.map((d) => d._id);
            await transfer.save();
        }

        const shareUrl = `${req.protocol}://${req.get("host")}/t/${shortCode}`;
        return res.status(201).json({
            id: transfer._id,
            shortCode,
            shareUrl,
            expiresAt: transfer.expiresAt,
            files: fileDocs.map((d) => ({ id: d._id, name: d.originalName, size: d.sizeBytes })),
        });
    } catch (e: any) {
        console.error(e);
        return res.status(500).json({ error: "Failed to create transfer" });
    }
}

export async function listMyTransfers(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;

    console.log("userId", userId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const items = await Transfer.find({ createdBy: userId as any })
        .sort({ createdAt: -1 })
        .populate('files')
        .lean();

    console.log('Found transfers:', items.length);
    console.log('First transfer files:', items[0]?.files);

    const data = items.map((t: any) => ({
        id: t._id,
        title: t.title,
        shortCode: t.shortCode,
        expiresAt: t.expiresAt,
        downloadCount: t.downloadCount,
        maxDownloads: t.maxDownloads,
        isActive: t.isActive,
        createdAt: t.createdAt,
        files: (t.files || []).map((f: any) => ({
            id: f._id,
            name: f.originalName,
            originalName: f.originalName,
            size: f.sizeBytes,
            sizeBytes: f.sizeBytes,
            relativePath: f.relativePath || "",
        })),
    }));

    console.log('Returning data with files:', data[0]?.files);
    return res.json({ transfers: data });
}

export async function getTransferDetail(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params as any;
    const t = await Transfer.findById(id).lean();
    if (!t) return res.status(404).json({ error: "Not found" });
    const files = await TransferFile.find({ transferId: id }).sort({ relativePath: 1, originalName: 1, version: -1 }).lean();
    return res.json({ transfer: t, files });
}

export async function addFiles(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params as any;
    const transfer = await Transfer.findById(id);
    if (!transfer) return res.status(404).json({ error: "Transfer not found" });
    if (String(transfer.createdBy) !== String(req.user?.id) && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden" });
    }
    const uploaded = (req.files as Express.Multer.File[]) || [];
    const pathsField = (req.body as any).paths;
    const paths: string[] = Array.isArray(pathsField)
        ? pathsField
        : (typeof pathsField === 'string' ? [pathsField] : []);
    const created: any[] = [];
    for (let i = 0; i < uploaded.length; i++) {
        const f = uploaded[i];
        const relativePath = paths[i] || (f as any).relativePath || "";
        const latest = await TransferFile.findOne({ transferId: id, relativePath, originalName: f.originalname }).sort({ version: -1 }).lean();
        const nextVersion = latest ? (latest.version + 1) : 1;
        const doc = await TransferFile.create({
            transferId: id,
            originalName: f.originalname,
            relativePath,
            storagePath: f.cloudinary?.secure_url || f.path, // Use Cloudinary URL if available
            cloudinaryPublicId: f.cloudinary?.public_id,
            cloudinaryUrl: f.cloudinary?.secure_url,
            mimeType: f.mimetype,
            sizeBytes: f.size,
            version: nextVersion,
        });
        created.push(doc);
    }
    // Ensure refs present
    const ids = created.map((d) => d._id);
    if (ids.length) await Transfer.findByIdAndUpdate(id, { $addToSet: { files: { $each: ids } } });
    return res.status(201).json({ files: created.map((d) => ({ id: d._id, name: d.originalName, relativePath: d.relativePath, version: d.version })) });
}

export async function resolveMeta(req: AuthenticatedRequest, res: Response) {
    const { shortCode } = req.params as any;
    const transfer = await Transfer.findOne({ shortCode, isActive: true }).populate("files");
    if (!transfer) {
        await TransferAccessLog.create({ shortCode, status: "not_found", ip: req.ip, userAgent: req.headers["user-agent"] });
        return res.status(404).json({ error: "Not found" });
    }
    const expired = transfer.expiresAt ? transfer.expiresAt.getTime() < Date.now() : false;
    if (expired) {
        await TransferAccessLog.create({ transferId: transfer._id, shortCode, status: "expired", ip: req.ip, userAgent: req.headers["user-agent"] });
    }
    return res.json({
        shortCode,
        title: transfer.title,
        description: transfer.description,
        expired,
        needsPassword: Boolean(transfer.passwordHash),
        files: (transfer as any).files.map((f: any) => ({ id: f._id, name: f.originalName, size: f.sizeBytes })),
    });
}

export async function requestAccess(req: AuthenticatedRequest, res: Response) {
    const { shortCode } = req.params as any;
    const { password } = req.body as any;
    const transfer = await Transfer.findOne({ shortCode, isActive: true }).populate("files");
    if (!transfer) {
        await TransferAccessLog.create({ shortCode, status: "not_found", ip: req.ip, userAgent: req.headers["user-agent"] });
        return res.status(404).json({ error: "Not found" });
    }
    if (transfer.expiresAt && transfer.expiresAt.getTime() < Date.now()) {
        await TransferAccessLog.create({ transferId: transfer._id, shortCode, status: "expired", ip: req.ip, userAgent: req.headers["user-agent"] });
        return res.status(410).json({ error: "Expired" });
    }
    if (transfer.passwordHash) {
        if (!password) {
            await TransferAccessLog.create({ transferId: transfer._id, shortCode, status: "password_required", ip: req.ip, userAgent: req.headers["user-agent"] });
            return res.status(401).json({ error: "Password required" });
        }
        const ok = await bcrypt.compare(password, transfer.passwordHash);
        if (!ok) {
            await TransferAccessLog.create({ transferId: transfer._id, shortCode, status: "password_failed", ip: req.ip, userAgent: req.headers["user-agent"] });
            return res.status(401).json({ error: "Invalid password" });
        }
    }

    const fileIds = (transfer as any).files.map((f: any) => String(f._id));
    const token = signTransferAccessToken(shortCode, fileIds, 300);
    await TransferAccessLog.create({ transferId: transfer._id, shortCode, status: "success", ip: req.ip, userAgent: req.headers["user-agent"] });

    return res.json({
        token,
        files: (transfer as any).files.map((f: any) => ({
            id: f._id,
            name: f.originalName,
            size: f.sizeBytes,
            relativePath: f.relativePath || "",
            url: `/api/transfers/${shortCode}/download/${f._id}?access=${token}`,
        })),
        downloadAllUrl: `/api/transfers/${shortCode}/download-all?access=${token}`,
    });
}

export async function downloadFile(req: AuthenticatedRequest, res: Response) {
    const { shortCode, fileId } = req.params as any;
    const token = String(req.query.access || "");
    if (!token) return res.status(401).json({ error: "Missing access token" });
    try {
        const claims = verifyTransferAccessToken(token);
        if (claims.sc !== shortCode || !claims.f?.includes(fileId)) return res.status(401).json({ error: "Invalid token" });
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }

    const tf = await TransferFile.findById(fileId);
    if (!tf) return res.status(404).json({ error: "File not found" });

    // If file has Cloudinary URL, redirect to it
    if (tf.cloudinaryUrl) {
        return res.redirect(tf.cloudinaryUrl);
    }

    // Fallback to local file serving for backward compatibility
    const filePath = tf.storagePath;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File missing" });

    res.setHeader("Content-Type", tf.mimeType);
    res.setHeader("Content-Length", String(tf.sizeBytes));
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(tf.originalName)}"`);
    fs.createReadStream(filePath).pipe(res);
}

export async function downloadAll(req: AuthenticatedRequest, res: Response) {
    const { shortCode } = req.params as any;
    const token = String(req.query.access || "");
    if (!token) return res.status(401).json({ error: "Missing access token" });
    let fileIds: string[] = [];
    try {
        const claims = verifyTransferAccessToken(token);
        if (claims.sc !== shortCode || !claims.f || claims.f.length === 0) return res.status(401).json({ error: "Invalid token" });
        fileIds = claims.f;
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }

    const files = await TransferFile.find({ _id: { $in: fileIds } }).lean();
    if (!files || files.length === 0) return res.status(404).json({ error: "No files" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="transfer-${shortCode}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
        console.error("Zip error:", err);
        res.status(500).end();
    });
    archive.pipe(res);

    for (const f of files) {
        if (f.cloudinaryUrl) {
            // For Cloudinary files, we need to fetch them and add to archive
            try {
                const response = await fetch(f.cloudinaryUrl);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    archive.append(Buffer.from(buffer), { name: f.originalName });
                }
            } catch (error) {
                console.error(`Error fetching Cloudinary file ${f.originalName}:`, error);
            }
        } else if (fs.existsSync(f.storagePath)) {
            // Fallback to local file
            archive.file(f.storagePath, { name: f.originalName });
        }
    }
    await archive.finalize();
}


// Delete a transfer and all associated files and logs
export async function deleteTransfer(req: AuthenticatedRequest, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        console.log('Delete transfer called with ID:', id);
        console.log('User ID:', userId);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        // Find the transfer and verify ownership
        const transfer = await Transfer.findById(id);
        console.log('Transfer found:', transfer ? 'YES' : 'NO');

        if (!transfer) return res.status(404).json({ error: "Transfer not found" });

        if (String(transfer.createdBy) !== String(userId)) {
            return res.status(403).json({ error: "You don't have permission to delete this transfer" });
        }

        // Get all associated files
        const files = await TransferFile.find({ transferId: id });

        // Delete physical files from storage
        for (const file of files) {
            try {
                const filePath = path.resolve(file.storagePath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted file: ${filePath}`);
                }
            } catch (err) {
                console.error(`Failed to delete file ${file.storagePath}:`, err);
            }
        }

        // Delete all transfer files from database
        await TransferFile.deleteMany({ transferId: id });
        console.log(`Deleted ${files.length} transfer file records`);

        // Delete all access logs
        const accessLogsResult = await TransferAccessLog.deleteMany({ transferId: id });
        console.log(`Deleted ${accessLogsResult.deletedCount} access log records`);

        // Delete the transfer itself
        await Transfer.findByIdAndDelete(id);
        console.log(`Deleted transfer: ${id}`);

        return res.json({
            message: "Transfer deleted successfully",
            filesDeleted: files.length,
            logsDeleted: accessLogsResult.deletedCount
        });
    } catch (error) {
        console.error("Error deleting transfer:", error);
        return res.status(500).json({ error: "Failed to delete transfer" });
    }
}


