import express from "express";
import cors from "cors";
import path from "path";
import engine from "ejs-mate";
import cookieParser from "cookie-parser";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import userRoutes from "./routes/userRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";

const app = express();

const allowedOrigins = (process.env.FRONTEND_URLS || "").split(",").map(s => s.trim()).filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS blocked: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition", "message"]
}));


app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, '../public')));


// Routes
app.get("/", (req, res) => {
    return res.render("pages/importFile");
});

app.use("/users", userRoutes);
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