import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let mongoDB;

export async function setup() {

    if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = "test-JWT-456";
    }

    if (process.env.TEST_MONGO_URI) {
        process.env.MONGO_URI = process.env.TEST_MONGO_URI;
    }
    else {
        mongoDB = await MongoMemoryServer.create({
            binary: {
                version: "8.2.6", // download ~781 MB  -> 74 MB
                downloadDir: "./tests/mongodb-binaries"
            }
        });
        process.env.MONGO_URI = mongoDB.getUri();
    }
}

export async function teardown() {
    await mongoose.disconnect();
    if (mongoDB) await mongoDB.stop();
}
