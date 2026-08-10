import express from "express";
import cors from "cors";
import path from "path";
import engine from "ejs-mate";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import connectDB from "./config/db.js";
import authRoutes from "./routes/userRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";

const app = express();

let allowedOrigins = null;

app.use(cors({
    origin: (origin, callback) => {
        if (allowedOrigins === null) {
            allowedOrigins = (process.env.FRONTEND_URLS || "").split(",").map(s => s.trim());
        }
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS blocked: ${origin}`);
            callback(new Error("Not allowed by CORS"))
        }
    },
    credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, '../public')));

app.use(async (req, res, next) => {
    if (mongoose.connection.readyState === 1) {
        return next();
    }

    if (mongoose.connection.readyState === 2) {
        await new Promise((resolve, reject) => {
            mongoose.connection.once("connected", resolve);
            mongoose.connection.once("error", reject);
        });
        return next();
    }

    try {
        await connectDB();
        return next();
    } catch (err) {
        console.error("DB Connection failed: ", err.message);
        return res.status(503).json({ error: "Database connection failed" });
    }
});


// Routes
app.get("/", (req, res) => {
    return res.render("pages/importFile");
});

app.use("/users", authRoutes);
app.use("/contacts", contactRoutes);

app.use("/", (req, res) => {
    return res.status(404).render("pages/pageNotFound");
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {

    if (err.message === "Not allowed by CORS") {
        return res.status(403).json({ error: "Not allowed by CORS" });
    }

    console.error("Internal ERROR:", err.message || err);
    return res.status(500).json({ error: err.message || "internal server error" });
});


export default app;