import "server-only";

import mongoose, { type Mongoose } from "mongoose";
import { getDatabaseEnv } from "@/config/env";
import { AppError } from "@/server/http/app-error";

type MongooseCache = {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache = globalForMongoose.mongooseCache ?? {
  connection: null,
  promise: null,
};

globalForMongoose.mongooseCache = cache;

export async function connectToDatabase(): Promise<Mongoose> {
  if (cache.connection) {
    return cache.connection;
  }

  if (!cache.promise) {
    let env;
    try {
      env = getDatabaseEnv();
      console.log("Database environment variables loaded successfully.", env);
    } catch {
      throw new AppError({
        category: "EXTERNAL_SERVICE_ERROR",
        message: "Account service is not configured.",
      });
    }
    const { MONGODB_DB_NAME, MONGODB_URI } = env;
    console.log(
      "Connecting to MongoDB:",
      MONGODB_URI,
      "Database:",
      MONGODB_DB_NAME,
    );

    cache.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 5000,
      })
      .catch((error) => {
        console.error("❌ MongoDB connection failed:", error);

        cache.promise = null;

        throw new AppError({
          category: "EXTERNAL_SERVICE_ERROR",
          message:
            "Account service is temporarily unavailable. Please try again.",
        });
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}
