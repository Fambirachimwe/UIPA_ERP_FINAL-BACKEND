import { Request, Response } from "express";
import { QMSDocument } from "../models/QMSDocument";
import { NonConformance } from "../models/NonConformance";
import { CAPA } from "../models/CAPA";
import { InternalAudit } from "../models/InternalAudit";
import { ManagementReview } from "../models/ManagementReview";
import { TrainingRecord } from "../models/TrainingRecord";
import { CustomerFeedback } from "../models/CustomerFeedback";
import { User } from "../models/User";
import { Employee } from "../models/Employee";
import { ReferenceCounter } from "../models/ReferenceCounter";

// Generate unique reference numbers
const generateReferenceNumber = async (prefix: string): Promise<string> => {
    const counter = await ReferenceCounter.findOneAndUpdate(
        { prefix },
        { $inc: { sequence: 1 } },
        { upsert: true, new: true }
    );
    const sequence = counter.sequence.toString().padStart(4, "0");
    return `${prefix}-${new Date().getFullYear()}-${sequence}`;
};

// QMS Dashboard - Get overview statistics
export const getQMSDashboard = async (req: Request, res: Response) => {
    try {
        const user = req.user;

        // Get counts for dashboard
        const [
            totalDocuments,
            pendingReviews,
            openNCRs,
            activeCAPAs,
            upcomingAudits,
            pendingTraining,
            openComplaints,
        ] = await Promise.all([
            QMSDocument.countDocuments({ status: "approved" }),
            QMSDocument.countDocuments({ status: "under_review" }),
            NonConformance.countDocuments({ status: { $in: ["open", "investigation", "corrective_action"] } }),
            CAPA.countDocuments({ status: { $in: ["initiated", "investigation", "planning", "implementation"] } }),
            InternalAudit.countDocuments({ status: "planned" }),
            TrainingRecord.countDocuments({ status: "scheduled" }),
            CustomerFeedback.countDocuments({ status: { $in: ["received", "acknowledged", "investigating"] } }),
        ]);

        // Get recent activities
        const recentActivities = await Promise.all([
            QMSDocument.find({ status: "approved" })
                .populate("createdBy", "name email")
                .sort({ updatedAt: -1 })
                .limit(5)
                .select("title documentNumber status updatedAt"),
            NonConformance.find({ status: { $in: ["open", "investigation"] } })
                .populate("reportedBy", "name email")
                .sort({ createdAt: -1 })
                .limit(5)
                .select("title ncrNumber status severity createdAt"),
            CAPA.find({ status: { $in: ["initiated", "investigation"] } })
                .populate("initiatedBy", "name email")
                .sort({ createdAt: -1 })
                .limit(5)
                .select("title capaNumber status priority createdAt"),
        ]);

        // Get KPIs for charts
        const kpis = {
            ncrTrends: await getNCRTrends(),
            capaEffectiveness: await getCAPAEffectiveness(),
            auditResults: await getAuditResults(),
            trainingCompletion: await getTrainingCompletion(),
            customerSatisfaction: await getCustomerSatisfaction(),
        };

        res.json({
            success: true,
            data: {
                summary: {
                    totalDocuments,
                    pendingReviews,
                    openNCRs,
                    activeCAPAs,
                    upcomingAudits,
                    pendingTraining,
                    openComplaints,
                },
                recentActivities: {
                    documents: recentActivities[0],
                    ncr: recentActivities[1],
                    capa: recentActivities[2],
                },
                kpis,
            },
        });
    } catch (error: any) {
        console.error("Error fetching QMS dashboard:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch QMS dashboard",
            error: error.message,
        });
    }
};

// Helper functions for KPIs
const getNCRTrends = async () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trends = await NonConformance.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: {
                    month: { $month: "$createdAt" },
                    year: { $year: "$createdAt" },
                    severity: "$severity",
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return trends;
};

const getCAPAEffectiveness = async () => {
    const effectiveness = await CAPA.aggregate([
        {
            $group: {
                _id: "$effectivenessVerification.effectiveness",
                count: { $sum: 1 },
            },
        },
    ]);

    return effectiveness;
};

const getAuditResults = async () => {
    const results = await InternalAudit.aggregate([
        {
            $group: {
                _id: "$auditReport.overallRating",
                count: { $sum: 1 },
            },
        },
    ]);

    return results;
};

const getTrainingCompletion = async () => {
    const completion = await TrainingRecord.aggregate([
        {
            $unwind: "$attendees",
        },
        {
            $group: {
                _id: "$attendees.completionStatus",
                count: { $sum: 1 },
            },
        },
    ]);

    return completion;
};

const getCustomerSatisfaction = async () => {
    const satisfaction = await CustomerFeedback.aggregate([
        {
            $group: {
                _id: "$impact.customerSatisfaction",
                count: { $sum: 1 },
            },
        },
    ]);

    return satisfaction;
};

// Get QMS statistics for reporting
export const getQMSStatistics = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, department } = req.query;

        const matchQuery: any = {};
        if (startDate && endDate) {
            matchQuery.createdAt = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string),
            };
        }
        if (department) {
            matchQuery.department = department;
        }

        const [
            documentStats,
            ncrStats,
            capaStats,
            auditStats,
            trainingStats,
            feedbackStats,
        ] = await Promise.all([
            getDocumentStatistics(matchQuery),
            getNCRStatistics(matchQuery),
            getCAPAStatistics(matchQuery),
            getAuditStatistics(matchQuery),
            getTrainingStatistics(matchQuery),
            getFeedbackStatistics(matchQuery),
        ]);

        res.json({
            success: true,
            data: {
                documents: documentStats,
                nonConformances: ncrStats,
                capa: capaStats,
                audits: auditStats,
                training: trainingStats,
                feedback: feedbackStats,
            },
        });
    } catch (error: any) {
        console.error("Error fetching QMS statistics:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch QMS statistics",
            error: error.message,
        });
    }
};

// Helper functions for statistics
const getDocumentStatistics = async (matchQuery: any) => {
    return await QMSDocument.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);
};

const getNCRStatistics = async (matchQuery: any) => {
    return await NonConformance.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: { status: "$status", severity: "$severity" },
                count: { $sum: 1 },
            },
        },
    ]);
};

const getCAPAStatistics = async (matchQuery: any) => {
    return await CAPA.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: { status: "$status", type: "$type" },
                count: { $sum: 1 },
            },
        },
    ]);
};

const getAuditStatistics = async (matchQuery: any) => {
    return await InternalAudit.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);
};

const getTrainingStatistics = async (matchQuery: any) => {
    return await TrainingRecord.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);
};

const getFeedbackStatistics = async (matchQuery: any) => {
    return await CustomerFeedback.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: { status: "$status", type: "$type" },
                count: { $sum: 1 },
            },
        },
    ]);
};

// Search across all QMS modules
export const searchQMS = async (req: Request, res: Response) => {
    try {
        const { query, modules, limit = 10 } = req.query;
        const searchLimit = Math.min(parseInt(limit as string), 50);

        if (!query || typeof query !== "string") {
            return res.status(400).json({
                success: false,
                message: "Search query is required",
            });
        }

        const searchModules = modules ? (modules as string).split(",") : ["documents", "ncr", "capa", "audits", "training", "feedback"];
        const results: any = {};

        // Search in each module
        for (const module of searchModules) {
            switch (module) {
                case "documents":
                    results.documents = await QMSDocument.find({
                        $or: [
                            { title: { $regex: query, $options: "i" } },
                            { documentNumber: { $regex: query, $options: "i" } },
                            { content: { $regex: query, $options: "i" } },
                            { tags: { $in: [new RegExp(query, "i")] } },
                        ],
                    })
                        .populate("createdBy", "name email")
                        .select("title documentNumber status documentType createdAt")
                        .limit(searchLimit)
                        .sort({ updatedAt: -1 });
                    break;

                case "ncr":
                    results.ncr = await NonConformance.find({
                        $or: [
                            { title: { $regex: query, $options: "i" } },
                            { ncrNumber: { $regex: query, $options: "i" } },
                            { description: { $regex: query, $options: "i" } },
                        ],
                    })
                        .populate("reportedBy", "name email")
                        .select("title ncrNumber status severity category createdAt")
                        .limit(searchLimit)
                        .sort({ createdAt: -1 });
                    break;

                case "capa":
                    results.capa = await CAPA.find({
                        $or: [
                            { title: { $regex: query, $options: "i" } },
                            { capaNumber: { $regex: query, $options: "i" } },
                            { description: { $regex: query, $options: "i" } },
                        ],
                    })
                        .populate("initiatedBy", "name email")
                        .select("title capaNumber status type priority createdAt")
                        .limit(searchLimit)
                        .sort({ createdAt: -1 });
                    break;

                case "audits":
                    results.audits = await InternalAudit.find({
                        $or: [
                            { title: { $regex: query, $options: "i" } },
                            { auditNumber: { $regex: query, $options: "i" } },
                            { description: { $regex: query, $options: "i" } },
                        ],
                    })
                        .populate("leadAuditor", "name email")
                        .select("title auditNumber status auditType plannedStartDate")
                        .limit(searchLimit)
                        .sort({ plannedStartDate: -1 });
                    break;

                case "training":
                    results.training = await TrainingRecord.find({
                        $or: [
                            { title: { $regex: query, $options: "i" } },
                            { trainingNumber: { $regex: query, $options: "i" } },
                            { description: { $regex: query, $options: "i" } },
                        ],
                    })
                        .populate("instructor", "name email")
                        .select("title trainingNumber status trainingType scheduledDate")
                        .limit(searchLimit)
                        .sort({ scheduledDate: -1 });
                    break;

                case "feedback":
                    results.feedback = await CustomerFeedback.find({
                        $or: [
                            { subject: { $regex: query, $options: "i" } },
                            { feedbackNumber: { $regex: query, $options: "i" } },
                            { description: { $regex: query, $options: "i" } },
                            { "customer.name": { $regex: query, $options: "i" } },
                        ],
                    })
                        .populate("assignedTo", "name email")
                        .select("subject feedbackNumber type status priority receivedDate")
                        .limit(searchLimit)
                        .sort({ receivedDate: -1 });
                    break;
            }
        }

        res.json({
            success: true,
            data: results,
        });
    } catch (error: any) {
        console.error("Error searching QMS:", error);
        res.status(500).json({
            success: false,
            message: "Failed to search QMS",
            error: error.message,
        });
    }
};

// Get user's QMS tasks and responsibilities
export const getUserQMSTasks = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        const userId = user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        // Get tasks from different modules
        const [
            documentsToReview,
            ncrToInvestigate,
            capaToComplete,
            auditTasks,
            trainingToAttend,
            feedbackToHandle,
        ] = await Promise.all([
            // Documents to review
            QMSDocument.find({
                $or: [
                    { "accessRights.approve": userId },
                    { reviewedBy: userId },
                ],
                status: { $in: ["under_review", "draft"] },
            })
                .populate("createdBy", "name email")
                .select("title documentNumber status documentType createdAt")
                .sort({ createdAt: -1 }),

            // NCR to investigate
            NonConformance.find({
                $or: [
                    { assignedTo: userId },
                    { reportedBy: userId },
                ],
                status: { $in: ["open", "investigation"] },
            })
                .populate("reportedBy", "name email")
                .select("title ncrNumber status severity category createdAt")
                .sort({ createdAt: -1 }),

            // CAPA to complete
            CAPA.find({
                $or: [
                    { assignedTo: userId },
                    { initiatedBy: userId },
                    { teamMembers: userId },
                ],
                status: { $in: ["initiated", "investigation", "planning", "implementation"] },
            })
                .populate("initiatedBy", "name email")
                .select("title capaNumber status type priority createdAt")
                .sort({ createdAt: -1 }),

            // Audit tasks
            InternalAudit.find({
                $or: [
                    { leadAuditor: userId },
                    { auditTeam: userId },
                    { "auditee.responsible": userId },
                ],
                status: { $in: ["planned", "in_progress"] },
            })
                .populate("leadAuditor", "name email")
                .select("title auditNumber status auditType plannedStartDate")
                .sort({ plannedStartDate: 1 }),

            // Training to attend
            TrainingRecord.find({
                "attendees.employee": userId,
                status: "scheduled",
            })
                .select("title trainingNumber scheduledDate duration location")
                .sort({ scheduledDate: 1 }),

            // Customer feedback to handle
            CustomerFeedback.find({
                assignedTo: userId,
                status: { $in: ["received", "acknowledged", "investigating"] },
            })
                .select("subject feedbackNumber type status priority receivedDate")
                .sort({ receivedDate: -1 }),
        ]);

        res.json({
            success: true,
            data: {
                documentsToReview,
                ncrToInvestigate,
                capaToComplete,
                auditTasks,
                trainingToAttend,
                feedbackToHandle,
            },
        });
    } catch (error: any) {
        console.error("Error fetching user QMS tasks:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user QMS tasks",
            error: error.message,
        });
    }
};
