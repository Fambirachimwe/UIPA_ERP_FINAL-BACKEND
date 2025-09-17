import { createServer } from "http";
import { createApp } from "./app";
import { connectToDatabase } from "./utils/db";
import { env } from "./utils/env";

async function bootstrap() {
    const app = createApp();
    const server = createServer(app);

    server.listen(env.port, () => {
        // eslint-disable-next-line no-console
        console.log(`Backend running on http://localhost:${env.port}`);
    });

    try {
        await connectToDatabase();
        // eslint-disable-next-line no-console
        console.log("MongoDB connected");
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("MongoDB connection failed", error);
    }
}

bootstrap().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", error);
    process.exit(1);
});

