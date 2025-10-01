import fs from "fs";
import path from "path";

export function ensureTransferDir(transferId: string): string {
    const dir = path.join(process.cwd(), "uploads", "transfers", transferId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

export function getReadStream(filePath: string) {
    return fs.createReadStream(filePath);
}


