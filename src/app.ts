import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/authRoutes";
import { employeeRouter } from "./routes/employeeRoutes";
import { userRouter } from "./routes/userRoutes";
import { dashboardRouter } from "./routes/dashboardRoutes";
import { contactRouter } from "./routes/contactRoutes";
import { timeOffRouter } from "./routes/timeOffRoutes";
import { documentRouter } from "./routes/documentRoutes";
import { notificationRouter } from "./routes/notificationRoutes";
import { mountSwagger } from "./utils/swagger";
import path from "path";

// http://localhost:4000/api/uploads/documents/c78545d6-95c0-4cf8-9b78-a04b7e266a51.pdf

export function createApp() {
    const app = express();

    // app.use(helmet());
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(morgan("dev"));

    // Serve uploaded documents statically
    app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });

    app.use("/api/auth", authRouter);
    app.use("/api/employees", employeeRouter);
    app.use("/api/users", userRouter);
    app.use("/api/dashboard", dashboardRouter);
    app.use("/api/contacts", contactRouter);
    app.use("/api/time-off", timeOffRouter);
    app.use("/api/documents", documentRouter);
    app.use("/api/notifications", notificationRouter);

    mountSwagger(app);

    return app;
}

