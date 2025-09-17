import mongoose from "mongoose";
import { env } from "./env";

let isConnected = false;

export async function connectToDatabase(): Promise<typeof mongoose> {
    if (isConnected) return mongoose;

    mongoose.set("strictQuery", true);

    await mongoose.connect(env.mongoUri, {
        dbName: "uip_erp",
    });

    isConnected = true;
    return mongoose;
}


