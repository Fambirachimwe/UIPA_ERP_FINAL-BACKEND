import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/authRoutes";
import { employeeRouter } from "./routes/employeeRoutes";
import { dashboardRouter } from "./routes/dashboardRoutes";
import { contactRouter } from "./routes/contactRoutes";
import { timeOffRouter } from "./routes/timeOffRoutes";
import { documentRouter } from "./routes/documentRoutes";
import { mountSwagger } from "./utils/swagger";

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(morgan("dev"));

    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });

    app.use("/api/auth", authRouter);
    app.use("/api/employees", employeeRouter);
    app.use("/api/dashboard", dashboardRouter);
    app.use("/api/contacts", contactRouter);
    app.use("/api/time-off", timeOffRouter);
    app.use("/api/documents", documentRouter);

    mountSwagger(app);

    return app;
}

