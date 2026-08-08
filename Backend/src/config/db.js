import mongoose from "mongoose";
import dns from "node:dns";

dns.setServers([
    "1.1.1.1", // cloudflare
    "8.8.8.8" // google
]);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, { dbName: "contacts_manager" });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

    } catch (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    }
};

export default connectDB;