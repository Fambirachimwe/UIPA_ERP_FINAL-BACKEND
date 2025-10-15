import swaggerJSDoc from "swagger-jsdoc";
import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import type { OpenAPIV3 } from "openapi-types";

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.3",
        info: {
            title: "UIP ERP API",
            version: "1.0.0",
            description: "API documentation for UIP ERP",
        },
        servers: [{ url: "http://localhost:4000" }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
                cookieAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "access_token",
                },
            },
            schemas: {
                Transfer: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        shortCode: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        files: { type: "array", items: { $ref: "#/components/schemas/TransferFile" } },
                        expiresAt: { type: "string", format: "date-time" },
                        maxDownloads: { type: "number" },
                        downloadCount: { type: "number" },
                        versioning: {
                            type: "object",
                            properties: {
                                mode: { type: "string", enum: ["auto", "explicit"] },
                                currentVersion: { type: "number" },
                            }
                        },
                        createdBy: { type: "string" },
                        isActive: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    }
                },
                TransferFile: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        transferId: { type: "string" },
                        originalName: { type: "string" },
                        storagePath: { type: "string" },
                        mimeType: { type: "string" },
                        sizeBytes: { type: "number" },
                        drawingId: { type: "string" },
                        version: { type: "number" },
                        checksum: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    }
                },
                TransferAccessLog: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        transferId: { type: "string" },
                        shortCode: { type: "string" },
                        ip: { type: "string" },
                        userAgent: { type: "string" },
                        status: { type: "string", enum: ["success", "password_required", "password_failed", "expired", "not_found"] },
                        createdAt: { type: "string", format: "date-time" },
                    }
                },
                User: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        email: { type: "string" },
                        role: { type: "string", enum: ["employee", "approver", "admin"] },
                        attributes: {
                            type: "object",
                            properties: {
                                department: { type: "string" },
                                employee_id: { type: "string" },
                                approval_level: { type: "string" },
                            },
                        },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                Employee: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        userId: { type: "string" },
                        name: { type: "string" },
                        email: { type: "string" },
                        phone: { type: "string" },
                        department: { type: "string" },
                        position: { type: "string" },
                        hireDate: { type: "string", format: "date" },
                        contractType: { type: "string" },
                        manager: { type: "string" },
                        salary: { type: "number" },
                        documents: {
                            type: "object",
                            properties: {
                                idCardUrl: { type: "string" },
                                resumeUrl: { type: "string" },
                                certificates: { type: "array", items: { type: "string" } },
                            },
                        },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                Contact: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        email: { type: "string" },
                        phone: { type: "string" },
                        category: { type: "string", enum: ["supplier", "service provider", "customer", "other"] },
                        companyName: { type: "string" },
                        address: { type: "string" },
                        notes: { type: "string" },
                        preferredContactMethod: { type: "string" },
                        linkedEmployee: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                LeaveType: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        defaultDays: { type: "number" },
                        carryOverRules: { type: "string" },
                        maxConsecutiveDays: { type: "number" },
                        eligibility: { type: "string" },
                        requiresApproval: { type: "boolean" },
                        isActive: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                LeaveBalance: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        employeeId: { type: "string" },
                        leaveTypeId: { type: "string" },
                        year: { type: "number" },
                        allocated: { type: "number" },
                        used: { type: "number" },
                        pending: { type: "number" },
                        carryOver: { type: "number" },
                        remaining: { type: "number" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                LeaveRequest: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        employeeId: { type: "string" },
                        leaveTypeId: { type: "string" },
                        startDate: { type: "string", format: "date" },
                        endDate: { type: "string", format: "date" },
                        totalDays: { type: "number" },
                        reason: { type: "string" },
                        status: { type: "string", enum: ["submitted", "approved_lvl1", "approved_final", "rejected", "cancelled"] },
                        approvalHistory: { type: "array", items: { type: "object" } },
                        documents: { type: "array", items: { type: "string" } },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                Document: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        referenceNumber: { type: "string" },
                        type: { type: "string", enum: ["report", "letter"] },
                        subType: { type: "string", enum: ["general", "project"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        author: { type: "string" },
                        department: { type: "string" },
                        projectId: { type: "string" },
                        documentUrl: { type: "string" },
                        currentVersion: { type: "string" },
                        versions: { type: "array", items: { type: "object" } },
                        originalFileName: { type: "string" },
                        fileSize: { type: "number" },
                        mimeType: { type: "string" },
                        tags: { type: "array", items: { type: "string" } },
                        category: { type: "string" },
                        status: { type: "string", enum: ["active", "archived", "deleted"] },
                        expiryDate: { type: "string", format: "date-time" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                Vehicle: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        registrationNumber: { type: "string" },
                        make: { type: "string" },
                        vehicleModel: { type: "string" },
                        year: { type: "number" },
                        mileage: { type: "number" },
                        fuelType: { type: "string" },
                        assignedTo: { $ref: "#/components/schemas/Employee" },
                        project: { type: "string" },
                        status: { type: "string", enum: ["active", "in maintenance", "retired"] },
                        insurance: {
                            type: "object",
                            properties: {
                                provider: { type: "string" },
                                policyNumber: { type: "string" },
                                expiryDate: { type: "string", format: "date" },
                            },
                        },
                        serviceSchedule: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    serviceDate: { type: "string", format: "date" },
                                    notes: { type: "string" },
                                },
                            },
                        },
                        documents: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    type: { type: "string" },
                                    name: { type: "string" },
                                    url: { type: "string" },
                                    publicId: { type: "string" },
                                    originalName: { type: "string" },
                                    size: { type: "number" },
                                    mimeType: { type: "string" },
                                    uploadedBy: { type: "string" },
                                    uploadedAt: { type: "string", format: "date-time" },
                                },
                            },
                        },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    },
    apis: [
        // Using inline JSDoc on route files would go here; for now we define paths programmatically below
    ],
};

const swaggerSpec = swaggerJSDoc(options) as OpenAPIV3.Document;

// Add paths programmatically (Auth, Employees)
swaggerSpec.paths = swaggerSpec.paths || {} as OpenAPIV3.PathsObject;
swaggerSpec.paths["/api/auth/login"] = {
    post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["email", "password"],
                        properties: { email: { type: "string" }, password: { type: "string" } },
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Login successful - tokens set as HTTP-only cookies",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                user: { $ref: "#/components/schemas/User" },
                            },
                        },
                    },
                },
                headers: {
                    "Set-Cookie": {
                        description: "HTTP-only cookies for access_token and refresh_token",
                        schema: { type: "string" },
                    },
                },
            },
            401: { description: "Invalid credentials" },
        },
    },
};

swaggerSpec.paths["/api/auth/register"] = {
    post: {
        tags: ["Auth"],
        summary: "Register",
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["email", "password"],
                        properties: {
                            email: { type: "string" },
                            password: { type: "string" },
                            role: { type: "string", enum: ["employee", "approver", "admin"] },
                            attributes: { $ref: "#/components/schemas/User/properties/attributes" },
                        },
                    },
                },
            },
        },
        responses: { 201: { description: "Created" }, 409: { description: "Conflict" } },
    },
};

swaggerSpec.paths["/api/auth/refresh"] = {
    post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        description: "Refreshes access token using refresh token from HTTP-only cookie. Implements token rotation for enhanced security.",
        requestBody: {
            required: false,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            refreshToken: {
                                type: "string",
                                description: "Optional - refresh token in request body (cookie preferred)"
                            },
                        },
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Token refreshed successfully - new tokens set as HTTP-only cookies",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                success: { type: "boolean" },
                            },
                        },
                    },
                },
                headers: {
                    "Set-Cookie": {
                        description: "New HTTP-only cookies for access_token and refresh_token",
                        schema: { type: "string" },
                    },
                },
            },
            400: { description: "Missing refresh token" },
            401: { description: "Invalid refresh token" },
        },
    },
};

swaggerSpec.paths["/api/auth/logout"] = {
    post: {
        tags: ["Auth"],
        summary: "Logout user",
        description: "Logs out user by invalidating refresh tokens and clearing HTTP-only cookies",
        requestBody: {
            required: false,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            refreshToken: {
                                type: "string",
                                description: "Optional - refresh token in request body (cookie preferred)"
                            },
                        },
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Logged out successfully - cookies cleared",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                success: { type: "boolean" },
                                message: { type: "string" },
                            },
                        },
                    },
                },
                headers: {
                    "Set-Cookie": {
                        description: "Cleared HTTP-only cookies",
                        schema: { type: "string" },
                    },
                },
            },
            500: { description: "Internal server error" },
        },
    },
};

swaggerSpec.paths["/api/employees"] = {
    get: {
        tags: ["Employees"],
        summary: "List employees",
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Employee" } } } },
            },
        },
    },
    post: {
        tags: ["Employees"],
        summary: "Create employee (requires existing user)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Employee" } } } },
        responses: { 201: { description: "Created" } },
    },
};

swaggerSpec.paths["/api/employees/create-with-user"] = {
    post: {
        tags: ["Employees"],
        summary: "Create employee with user account (Admin only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["email", "password", "name", "department"],
                        properties: {
                            email: { type: "string", format: "email" },
                            password: { type: "string", minLength: 6 },
                            role: { type: "string", enum: ["employee", "approver", "admin"], default: "employee" },
                            approval_level: { type: "string", enum: ["level1", "level2"] },
                            name: { type: "string" },
                            phone: { type: "string" },
                            department: { type: "string" },
                            position: { type: "string" },
                            hireDate: { type: "string", format: "date-time" },
                            contractType: { type: "string" },
                            manager: { type: "string" },
                            salary: { type: "number" },
                            employee_id: { type: "string" },
                            documents: {
                                type: "object",
                                properties: {
                                    idCardUrl: { type: "string" },
                                    resumeUrl: { type: "string" },
                                    certificates: { type: "array", items: { type: "string" } },
                                },
                            },
                        },
                    },
                },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                userId: { type: "string" },
                                name: { type: "string" },
                                email: { type: "string" },
                                department: { type: "string" },
                                position: { type: "string" },
                                role: { type: "string" },
                                approval_level: { type: "string" },
                                createdAt: { type: "string", format: "date-time" },
                                leaveBalancesInitialized: { type: "number" },
                                message: { type: "string" },
                            },
                        },
                    },
                },
            },
            409: { description: "Email or Employee ID already in use" },
        },
    },
};

swaggerSpec.paths["/api/employees/{employeeId}/initialize-leave-balances"] = {
    post: {
        tags: ["Employees"],
        summary: "Initialize leave balances for an employee (Admin only)",
        description: "Creates leave balance records for all active leave types for the specified employee and year",
        security: [{ bearerAuth: [] }],
        parameters: [
            { in: "path", name: "employeeId", required: true, schema: { type: "string" } }
        ],
        requestBody: {
            required: false,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            year: { type: "number", description: "Year for leave balances (defaults to current year)" },
                        },
                    },
                },
            },
        },
        responses: {
            201: {
                description: "Leave balances initialized successfully",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                success: { type: "boolean" },
                                message: { type: "string" },
                                employee: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        name: { type: "string" },
                                        email: { type: "string" },
                                        department: { type: "string" },
                                    },
                                },
                                balancesCreated: { type: "number" },
                                year: { type: "number" },
                            },
                        },
                    },
                },
            },
            404: { description: "Employee not found" },
            409: { description: "Leave balances already exist for this year" },
        },
    },
};

swaggerSpec.paths["/api/employees/{id}"] = {
    get: {
        tags: ["Employees"],
        summary: "Get employee",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Employee" } } } }, 404: { description: "Not found" } },
    },
    put: {
        tags: ["Employees"],
        summary: "Update employee",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Employee" } } } },
        responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
    },
    delete: {
        tags: ["Employees"],
        summary: "Delete employee",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 204: { description: "No Content" }, 404: { description: "Not found" } },
    },
};

// Contacts endpoints
swaggerSpec.paths["/api/contacts"] = {
    get: {
        tags: ["Contacts"],
        summary: "List contacts",
        security: [{ bearerAuth: [] }],
        parameters: [
            { in: "query", name: "search", schema: { type: "string" }, description: "Text search" },
            { in: "query", name: "category", schema: { type: "string", enum: ["supplier", "service provider", "customer", "other"] } },
        ],
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Contact" } } } },
            },
        },
    },
    post: {
        tags: ["Contacts"],
        summary: "Create contact",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Contact" } } } },
        responses: { 201: { description: "Created" } },
    },
};

swaggerSpec.paths["/api/contacts/{id}"] = {
    get: {
        tags: ["Contacts"],
        summary: "Get contact",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Contact" } } } }, 404: { description: "Not found" } },
    },
    put: {
        tags: ["Contacts"],
        summary: "Update contact",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Contact" } } } },
        responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
    },
    delete: {
        tags: ["Contacts"],
        summary: "Delete contact (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 204: { description: "No Content" }, 404: { description: "Not found" } },
    },
};

// Time Off endpoints
swaggerSpec.paths["/api/time-off/leave-types"] = {
    get: {
        tags: ["Time Off"],
        summary: "List leave types",
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/LeaveType" } } } },
            },
        },
    },
    post: {
        tags: ["Time Off"],
        summary: "Create leave type (Admin only)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LeaveType" } } } },
        responses: { 201: { description: "Created" } },
    },
};

swaggerSpec.paths["/api/time-off/balances/me"] = {
    get: {
        tags: ["Time Off"],
        summary: "Get my leave balances",
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/LeaveBalance" } } } },
            },
        },
    },
};

swaggerSpec.paths["/api/time-off/requests"] = {
    get: {
        tags: ["Time Off"],
        summary: "List leave requests",
        security: [{ bearerAuth: [] }],
        parameters: [
            { in: "query", name: "status", schema: { type: "string", enum: ["submitted", "approved_lvl1", "approved_final", "rejected", "cancelled"] } },
            { in: "query", name: "startDate", schema: { type: "string", format: "date" } },
            { in: "query", name: "endDate", schema: { type: "string", format: "date" } },
        ],
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/LeaveRequest" } } } },
            },
        },
    },
    post: {
        tags: ["Time Off"],
        summary: "Submit leave request",
        security: [{ bearerAuth: [] }],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["leaveTypeId", "startDate", "endDate", "reason"],
                        properties: {
                            leaveTypeId: { type: "string" },
                            startDate: { type: "string", format: "date" },
                            endDate: { type: "string", format: "date" },
                            reason: { type: "string" },
                            documents: { type: "array", items: { type: "string" } },
                        },
                    },
                },
            },
        },
        responses: { 201: { description: "Created" } },
    },
};

swaggerSpec.paths["/api/time-off/requests/{id}/approve"] = {
    post: {
        tags: ["Time Off"],
        summary: "Approve/reject leave request (Manager/Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["status"],
                        properties: {
                            status: { type: "string", enum: ["approved", "rejected"] },
                            comment: { type: "string" },
                        },
                    },
                },
            },
        },
        responses: { 200: { description: "OK" } },
    },
};

// Documents endpoints
swaggerSpec.paths["/api/documents"] = {
    get: {
        tags: ["Documents"],
        summary: "List documents (user sees own, admin sees all)",
        security: [{ bearerAuth: [] }],
        parameters: [
            { in: "query", name: "type", schema: { type: "string", enum: ["report", "letter"] } },
            { in: "query", name: "subType", schema: { type: "string", enum: ["general", "project"] } },
            { in: "query", name: "category", schema: { type: "string" } },
            { in: "query", name: "status", schema: { type: "string", enum: ["active", "archived", "deleted"] } },
            { in: "query", name: "search", schema: { type: "string" }, description: "Text search" },
            { in: "query", name: "page", schema: { type: "number", default: 1 } },
            { in: "query", name: "limit", schema: { type: "number", default: 50 } },
        ],
        responses: {
            200: {
                description: "OK",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                documents: { type: "array", items: { $ref: "#/components/schemas/Document" } },
                                pagination: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
    },
    post: {
        tags: ["Documents"],
        summary: "Upload new document",
        security: [{ bearerAuth: [] }],
        requestBody: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        required: ["document", "type", "subType", "title", "department"],
                        properties: {
                            document: { type: "string", format: "binary" },
                            type: { type: "string", enum: ["report", "letter"] },
                            subType: { type: "string", enum: ["general", "project"] },
                            title: { type: "string" },
                            description: { type: "string" },
                            department: { type: "string" },
                            projectId: { type: "string" },
                            projectNumber: { type: "string" },
                            tags: { type: "array", items: { type: "string" } },
                            category: { type: "string" },
                            expiryDate: { type: "string", format: "date-time" },
                        },
                    },
                },
            },
        },
        responses: { 201: { description: "Created" } },
    },
};

swaggerSpec.paths["/api/documents/preview-reference"] = {
    get: {
        tags: ["Documents"],
        summary: "Preview reference number format",
        security: [{ bearerAuth: [] }],
        parameters: [
            { in: "query", name: "type", required: true, schema: { type: "string", enum: ["report", "letter"] } },
            { in: "query", name: "subType", required: true, schema: { type: "string", enum: ["general", "project"] } },
            { in: "query", name: "projectNumber", schema: { type: "string" } },
        ],
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: { type: "object", properties: { referenceNumber: { type: "string" } } } } },
            },
        },
    },
};

swaggerSpec.paths["/api/documents/{id}"] = {
    get: {
        tags: ["Documents"],
        summary: "Get document details",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Document" } } } } },
    },
    put: {
        tags: ["Documents"],
        summary: "Update document metadata",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            tags: { type: "array", items: { type: "string" } },
                            category: { type: "string" },
                            expiryDate: { type: "string", format: "date-time" },
                            status: { type: "string", enum: ["active", "archived", "deleted"] },
                        },
                    },
                },
            },
        },
        responses: { 200: { description: "OK" } },
    },
    delete: {
        tags: ["Documents"],
        summary: "Delete document (soft delete)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 204: { description: "No Content" } },
    },
};

swaggerSpec.paths["/api/documents/{id}/download"] = {
    get: {
        tags: ["Documents"],
        summary: "Download document file",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
            200: {
                description: "File download",
                content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } },
            },
        },
    },
};

swaggerSpec.paths["/api/documents/{id}/versions"] = {
    post: {
        tags: ["Documents"],
        summary: "Upload new document version",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        required: ["document"],
                        properties: {
                            document: { type: "string", format: "binary" },
                            changeNotes: { type: "string" },
                        },
                    },
                },
            },
        },
        responses: { 200: { description: "OK" } },
    },
};

// Transfers endpoints
swaggerSpec.paths["/api/transfers"] = {
    get: {
        tags: ["Transfers"],
        summary: "List my transfers",
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: { type: "object", properties: { transfers: { type: "array", items: { $ref: "#/components/schemas/Transfer" } } } } } },
            },
            401: { description: "Unauthorized" },
        },
    },
    post: {
        tags: ["Transfers"],
        summary: "Create a new transfer with files",
        security: [{ bearerAuth: [] }],
        requestBody: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        required: ["title", "files"],
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            password: { type: "string" },
                            expiresAt: { type: "string", format: "date-time" },
                            maxDownloads: { type: "number" },
                            files: { type: "array", items: { type: "string", format: "binary" } },
                        },
                    },
                },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                shortCode: { type: "string" },
                                shareUrl: { type: "string" },
                                expiresAt: { type: "string", format: "date-time" },
                                files: { type: "array", items: { type: "object" } },
                            },
                        },
                    },
                },
            },
            400: { description: "Bad request" },
            401: { description: "Unauthorized" },
        },
    },
};
swaggerSpec.paths["/api/transfers/{id}"] = {
    get: {
        tags: ["Transfers"],
        summary: "Get transfer detail (with files and versions)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
    },
};

swaggerSpec.paths["/api/transfers/{id}/files"] = {
    post: {
        tags: ["Transfers"],
        summary: "Add files (supports folder upload and versioning)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            files: { type: "array", items: { type: "string", format: "binary" } },
                        },
                    },
                },
            },
        },
        responses: { 201: { description: "Files added" }, 404: { description: "Not found" } },
    },
};

swaggerSpec.paths["/api/transfers/{shortCode}/resolve"] = {
    get: {
        tags: ["Transfers"],
        summary: "Resolve public transfer metadata",
        parameters: [{ in: "path", name: "shortCode", required: true, schema: { type: "string" } }],
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: { type: "object" } } },
            },
            404: { description: "Not found" },
        },
    },
};

swaggerSpec.paths["/api/transfers/{shortCode}/access"] = {
    post: {
        tags: ["Transfers"],
        summary: "Request access to a transfer (password validation)",
        parameters: [{ in: "path", name: "shortCode", required: true, schema: { type: "string" } }],
        requestBody: {
            required: false,
            content: { "application/json": { schema: { type: "object", properties: { password: { type: "string" } } } } },
        },
        responses: {
            200: {
                description: "Access granted",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                token: { type: "string" },
                                files: { type: "array", items: { type: "object" } },
                                downloadAllUrl: { type: "string" },
                            },
                        },
                    },
                },
            },
            401: { description: "Unauthorized / password required or invalid" },
            404: { description: "Not found" },
            410: { description: "Expired" },
        },
    },
};

swaggerSpec.paths["/api/transfers/{shortCode}/download/{fileId}"] = {
    get: {
        tags: ["Transfers"],
        summary: "Download a single file from a transfer (requires access token)",
        parameters: [
            { in: "path", name: "shortCode", required: true, schema: { type: "string" } },
            { in: "path", name: "fileId", required: true, schema: { type: "string" } },
            { in: "query", name: "access", required: true, schema: { type: "string" } },
        ],
        responses: {
            200: { description: "File stream", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } },
            401: { description: "Invalid or missing access token" },
            404: { description: "File not found" },
        },
    },
};

swaggerSpec.paths["/api/transfers/{shortCode}/download-all"] = {
    get: {
        tags: ["Transfers"],
        summary: "Download all files as ZIP (requires access token)",
        parameters: [
            { in: "path", name: "shortCode", required: true, schema: { type: "string" } },
            { in: "query", name: "access", required: true, schema: { type: "string" } },
        ],
        responses: {
            200: { description: "ZIP stream", content: { "application/zip": { schema: { type: "string", format: "binary" } } } },
            401: { description: "Invalid or missing access token" },
            404: { description: "No files" },
        },
    },
};

// Employee Document Management
swaggerSpec.paths["/api/employees/{id}/documents/upload"] = {
    post: {
        tags: ["Employee Documents"],
        summary: "Upload employee document",
        description: "Upload a document for a specific employee (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
            {
                in: "path",
                name: "id",
                required: true,
                schema: { type: "string" },
                description: "Employee ID"
            }
        ],
        requestBody: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        required: ["document", "documentType"],
                        properties: {
                            document: {
                                type: "string",
                                format: "binary",
                                description: "Document file to upload"
                            },
                            documentType: {
                                type: "string",
                                enum: ["idCard", "resume", "contract", "certificate"],
                                description: "Type of document being uploaded"
                            },
                            documentName: {
                                type: "string",
                                description: "Custom name for the document (required for contracts and certificates)"
                            },
                        },
                    },
                },
            },
        },
        responses: {
            201: {
                description: "Document uploaded successfully",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                message: { type: "string" },
                                employee: {
                                    type: "object",
                                    description: "Updated employee object"
                                },
                                uploadedDocument: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string" },
                                        name: { type: "string" },
                                        url: { type: "string" },
                                        size: { type: "number" },
                                        mimeType: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            400: { description: "Bad request - invalid file or missing required fields" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden - admin access required" },
            404: { description: "Employee not found" },
            500: { description: "Internal server error" }
        },
    },
};

swaggerSpec.paths["/api/employees/{id}/documents"] = {
    delete: {
        tags: ["Employee Documents"],
        summary: "Delete employee document",
        description: "Delete a specific document for an employee (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
            {
                in: "path",
                name: "id",
                required: true,
                schema: { type: "string" },
                description: "Employee ID"
            }
        ],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["documentType"],
                        properties: {
                            documentType: {
                                type: "string",
                                enum: ["idCard", "resume", "contract", "certificate"],
                                description: "Type of document to delete"
                            },
                            documentIndex: {
                                type: "number",
                                description: "Index of document to delete (required for contracts and certificates)"
                            }
                        }
                    }
                }
            }
        },
        responses: {
            200: {
                description: "Document deleted successfully",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                message: { type: "string" },
                                employee: {
                                    type: "object",
                                    description: "Updated employee object"
                                }
                            }
                        }
                    }
                }
            },
            400: { description: "Bad request - invalid document type or index" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden - admin access required" },
            404: { description: "Employee or document not found" },
            500: { description: "Internal server error" }
        },
    },
};

swaggerSpec.paths["/api/employees/documents/{filename}"] = {
    get: {
        tags: ["Employee Documents"],
        summary: "View employee document",
        description: "Retrieve and view a specific employee document file",
        security: [{ bearerAuth: [] }],
        parameters: [
            {
                in: "path",
                name: "filename",
                required: true,
                schema: { type: "string" },
                description: "Document filename"
            }
        ],
        responses: {
            200: {
                description: "Document file",
                content: {
                    "application/pdf": { schema: { type: "string", format: "binary" } },
                    "application/msword": { schema: { type: "string", format: "binary" } },
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
                        schema: { type: "string", format: "binary" }
                    },
                    "image/jpeg": { schema: { type: "string", format: "binary" } },
                    "image/png": { schema: { type: "string", format: "binary" } },
                    "image/gif": { schema: { type: "string", format: "binary" } }
                }
            },
            401: { description: "Unauthorized" },
            404: { description: "File not found" },
            500: { description: "Internal server error" }
        },
    },
};

// Vehicles endpoints
swaggerSpec.paths["/api/vehicles"] = {
    get: {
        tags: ["Vehicles"],
        summary: "List vehicles with search and filtering",
        description: "Get all vehicles with optional search and filtering. Non-admin users see only vehicles assigned to them or in their department.",
        security: [{ bearerAuth: [] }],
        parameters: [
            { in: "query", name: "search", schema: { type: "string" }, description: "Search by name, registration, make, model, or project" },
            { in: "query", name: "status", schema: { type: "string", enum: ["active", "in maintenance", "retired"] }, description: "Filter by status" },
            { in: "query", name: "assignedTo", schema: { type: "string" }, description: "Filter by assigned employee ID" },
            { in: "query", name: "project", schema: { type: "string" }, description: "Filter by project" },
        ],
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: { type: "object", properties: { vehicles: { type: "array", items: { $ref: "#/components/schemas/Vehicle" } } } } } },
            },
            401: { description: "Unauthorized" },
        },
    },
    post: {
        tags: ["Vehicles"],
        summary: "Create new vehicle (Admin/Approver only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["name", "registrationNumber"],
                        properties: {
                            name: { type: "string" },
                            registrationNumber: { type: "string" },
                            make: { type: "string" },
                            vehicleModel: { type: "string" },
                            year: { type: "number" },
                            mileage: { type: "number" },
                            fuelType: { type: "string" },
                            assignedTo: { type: "string", description: "Employee ID" },
                            project: { type: "string" },
                            status: { type: "string", enum: ["active", "in maintenance", "retired"], default: "active" },
                            insurance: {
                                type: "object",
                                properties: {
                                    provider: { type: "string" },
                                    policyNumber: { type: "string" },
                                    expiryDate: { type: "string", format: "date" },
                                },
                            },
                        },
                    },
                },
            },
        },
        responses: {
            201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Vehicle" } } } },
            400: { description: "Bad request - missing required fields" },
            403: { description: "Forbidden - insufficient permissions" },
            409: { description: "Conflict - registration number already exists" },
        },
    },
};

swaggerSpec.paths["/api/vehicles/assignment-status"] = {
    get: {
        tags: ["Vehicles"],
        summary: "Get vehicle assignment status overview",
        description: "Get statistics and lists of assigned/unassigned vehicles",
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: "OK",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                assignedVehicles: { type: "array", items: { $ref: "#/components/schemas/Vehicle" } },
                                unassignedVehicles: { type: "array", items: { $ref: "#/components/schemas/Vehicle" } },
                                statusCounts: {
                                    type: "object",
                                    properties: {
                                        active: { type: "number" },
                                        inMaintenance: { type: "number" },
                                        retired: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            401: { description: "Unauthorized" },
        },
    },
};

swaggerSpec.paths["/api/vehicles/{id}"] = {
    get: {
        tags: ["Vehicles"],
        summary: "Get single vehicle",
        description: "Get details of a specific vehicle. Non-admin users can only access vehicles assigned to them or in their department.",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
            200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Vehicle" } } } },
            403: { description: "Forbidden - access denied" },
            404: { description: "Vehicle not found" },
        },
    },
    put: {
        tags: ["Vehicles"],
        summary: "Update vehicle",
        description: "Update vehicle details. Regular employees can only update vehicles assigned to them.",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            registrationNumber: { type: "string" },
                            make: { type: "string" },
                            vehicleModel: { type: "string" },
                            year: { type: "number" },
                            mileage: { type: "number" },
                            fuelType: { type: "string" },
                            assignedTo: { type: "string", description: "Employee ID" },
                            project: { type: "string" },
                            status: { type: "string", enum: ["active", "in maintenance", "retired"] },
                            insurance: {
                                type: "object",
                                properties: {
                                    provider: { type: "string" },
                                    policyNumber: { type: "string" },
                                    expiryDate: { type: "string", format: "date" },
                                },
                            },
                        },
                    },
                },
            },
        },
        responses: {
            200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Vehicle" } } } },
            400: { description: "Bad request" },
            403: { description: "Forbidden - insufficient permissions" },
            404: { description: "Vehicle not found" },
            409: { description: "Conflict - registration number already exists" },
        },
    },
    delete: {
        tags: ["Vehicles"],
        summary: "Delete vehicle (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
            204: { description: "No Content" },
            403: { description: "Forbidden - admin access required" },
            404: { description: "Vehicle not found" },
        },
    },
};

swaggerSpec.paths["/api/vehicles/{id}/documents"] = {
    post: {
        tags: ["Vehicle Documents"],
        summary: "Upload vehicle document (Admin/Approver only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        required: ["document"],
                        properties: {
                            document: { type: "string", format: "binary", description: "Document file to upload" },
                            documentType: { type: "string", description: "Type of document (e.g., registration, insurance, service)" },
                            documentName: { type: "string", description: "Custom name for the document" },
                        },
                    },
                },
            },
        },
        responses: {
            201: {
                description: "Document uploaded successfully",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                message: { type: "string" },
                                document: { type: "object" },
                                vehicle: { $ref: "#/components/schemas/Vehicle" },
                            },
                        },
                    },
                },
            },
            400: { description: "Bad request - no file uploaded" },
            403: { description: "Forbidden - insufficient permissions" },
            404: { description: "Vehicle not found" },
            500: { description: "Failed to upload document" },
        },
    },
};

swaggerSpec.paths["/api/vehicles/{id}/documents/{documentId}"] = {
    delete: {
        tags: ["Vehicle Documents"],
        summary: "Delete vehicle document (Admin/Approver only)",
        security: [{ bearerAuth: [] }],
        parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" } },
            { in: "path", name: "documentId", required: true, schema: { type: "string" } },
        ],
        responses: {
            200: {
                description: "Document deleted successfully",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                message: { type: "string" },
                                vehicle: { $ref: "#/components/schemas/Vehicle" },
                            },
                        },
                    },
                },
            },
            403: { description: "Forbidden - insufficient permissions" },
            404: { description: "Vehicle or document not found" },
        },
    },
};

swaggerSpec.paths["/api/vehicles/{id}/service"] = {
    post: {
        tags: ["Vehicle Service"],
        summary: "Add service record (Admin/Approver only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["serviceDate"],
                        properties: {
                            serviceDate: { type: "string", format: "date", description: "Date of service" },
                            notes: { type: "string", description: "Service notes" },
                        },
                    },
                },
            },
        },
        responses: {
            201: {
                description: "Service record added successfully",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                message: { type: "string" },
                                serviceRecord: { type: "object" },
                                vehicle: { $ref: "#/components/schemas/Vehicle" },
                            },
                        },
                    },
                },
            },
            400: { description: "Bad request - service date required" },
            403: { description: "Forbidden - insufficient permissions" },
            404: { description: "Vehicle not found" },
        },
    },
};

swaggerSpec.paths["/api/vehicles/{id}/status"] = {
    put: {
        tags: ["Vehicle Status"],
        summary: "Update vehicle status (Admin/Approver only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["status"],
                        properties: {
                            status: { type: "string", enum: ["active", "in maintenance", "retired"] },
                        },
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Status updated successfully",
                content: { "application/json": { schema: { $ref: "#/components/schemas/Vehicle" } } },
            },
            400: { description: "Bad request - invalid status" },
            403: { description: "Forbidden - insufficient permissions" },
            404: { description: "Vehicle not found" },
        },
    },
};

export function mountSwagger(app: Express) {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}


