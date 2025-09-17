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
            },
            schemas: {
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
            },
        },
        security: [{ bearerAuth: [] }],
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
                description: "Tokens and user",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                accessToken: { type: "string" },
                                refreshToken: { type: "string" },
                                user: { $ref: "#/components/schemas/User" },
                            },
                        },
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
        summary: "Create employee",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Employee" } } } },
        responses: { 201: { description: "Created" } },
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

export function mountSwagger(app: Express) {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}


