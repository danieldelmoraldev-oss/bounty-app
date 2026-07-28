import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bounty";

let cachedClient: typeof mongoose | null = null;

export async function connectDB() {
  if (cachedClient) return cachedClient;

  try {
    cachedClient = await mongoose.connect(MONGODB_URI);
    console.log("[DB] Conectado a MongoDB");
    return cachedClient;
  } catch (error) {
    console.error("[DB] Error conectando a MongoDB:", error);
    throw error;
  }
}