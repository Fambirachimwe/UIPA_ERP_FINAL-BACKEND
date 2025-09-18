import { ReferenceCounter } from "../models/ReferenceCounter";
import { Employee } from "../models/Employee";
import { User } from "../models/User";

export interface ReferenceRequest {
    type: "report" | "letter";
    subType: "general" | "project";
    userId: string;
    projectNumber?: string;
    projectId?: string;
}

/**
 * Generate reference number based on document type and context
 */
export async function generateReferenceNumber(request: ReferenceRequest): Promise<string> {
    const { type, subType, userId, projectNumber } = request;
    const currentYear = new Date().getFullYear();

    // Get user details
    const user = await User.findById(userId);
    const employee = await Employee.findOne({ userId });

    if (!user || !employee) {
        throw new Error("User or employee profile not found");
    }

    let referencePrefix: string;
    let counterType: string;

    if (type === "report") {
        if (subType === "general") {
            // Format: RPT-[DPT]-[year]-[incremental number]
            referencePrefix = `RPT-${employee.department?.toUpperCase() || "GEN"}`;
            counterType = `${referencePrefix}-${currentYear}`;
        } else {
            // Format: RPT-[project number]-[year]-[incremental number]
            if (!projectNumber) throw new Error("Project number required for project reports");
            referencePrefix = `RPT-${projectNumber}`;
            counterType = `${referencePrefix}-${currentYear}`;
        }
    } else {
        // Letter
        const initials = getInitials(employee.name);

        if (subType === "general") {
            // Format: L-[firstname and lastname initials]-[department]-[increment]
            referencePrefix = `L-${initials}-${employee.department?.toUpperCase() || "GEN"}`;
            counterType = referencePrefix; // No year for letters
        } else {
            // Format: L-[firstname and lastname initials]-[project number]-[increment]
            if (!projectNumber) throw new Error("Project number required for project letters");
            referencePrefix = `L-${initials}-${projectNumber}`;
            counterType = referencePrefix; // No year for letters
        }
    }

    // Get or create counter
    const counter = await ReferenceCounter.findOneAndUpdate(
        { type: counterType },
        {
            $inc: { lastNumber: 1 },
            $setOnInsert: {
                year: type === "report" ? currentYear : undefined
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    // Build final reference number
    let referenceNumber: string;

    if (type === "report") {
        referenceNumber = `${referencePrefix}-${currentYear}-${counter.lastNumber.toString().padStart(3, '0')}`;
    } else {
        referenceNumber = `${referencePrefix}-${counter.lastNumber.toString().padStart(3, '0')}`;
    }

    return referenceNumber;
}

/**
 * Preview reference number format without incrementing counter
 */
export async function previewReferenceNumber(request: ReferenceRequest): Promise<string> {
    const { type, subType, userId, projectNumber } = request;
    const currentYear = new Date().getFullYear();

    // Get user details
    const user = await User.findById(userId);
    const employee = await Employee.findOne({ userId });

    if (!user || !employee) {
        throw new Error("User or employee profile not found");
    }

    let referencePrefix: string;
    let counterType: string;

    if (type === "report") {
        if (subType === "general") {
            referencePrefix = `RPT-${employee.department?.toUpperCase() || "GEN"}`;
            counterType = `${referencePrefix}-${currentYear}`;
        } else {
            if (!projectNumber) throw new Error("Project number required for project reports");
            referencePrefix = `RPT-${projectNumber}`;
            counterType = `${referencePrefix}-${currentYear}`;
        }
    } else {
        const initials = getInitials(employee.name);

        if (subType === "general") {
            referencePrefix = `L-${initials}-${employee.department?.toUpperCase() || "GEN"}`;
            counterType = referencePrefix;
        } else {
            if (!projectNumber) throw new Error("Project number required for project letters");
            referencePrefix = `L-${initials}-${projectNumber}`;
            counterType = referencePrefix;
        }
    }

    // Get current counter without incrementing
    const counter = await ReferenceCounter.findOne({ type: counterType });
    const nextNumber = (counter?.lastNumber || 0) + 1;

    // Build preview reference number
    let referenceNumber: string;

    if (type === "report") {
        referenceNumber = `${referencePrefix}-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;
    } else {
        referenceNumber = `${referencePrefix}-${nextNumber.toString().padStart(3, '0')}`;
    }

    return referenceNumber;
}

/**
 * Extract initials from full name
 */
function getInitials(fullName: string): string {
    const names = fullName.trim().split(/\s+/);
    if (names.length === 1) {
        // Single name, use first two characters
        return names[0].substring(0, 2).toUpperCase();
    }

    // Multiple names, use first letter of first and last name
    const firstName = names[0];
    const lastName = names[names.length - 1];
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
