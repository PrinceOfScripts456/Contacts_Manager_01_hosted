import rateLimit from "express-rate-limit";
import { formatDuration } from "../utils/utils.js";

const rateLimitHandler = (req, res) => {
    const resetTime = req.rateLimit?.resetTime;

    return res.status(429).json({
        error: `Too many attempts. Please try again later.\n${resetTime
            ? formatDuration(resetTime - Date.now())
            : "unknown"
            } left`
    });
};

const loginLimit = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 min
    limit: 10,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    handler: rateLimitHandler
});

const signupLimit = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 min
    limit: 4,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    handler: rateLimitHandler
});

const contactsLimit = rateLimit({
    windowMs: 1000 * 60 * 15, // 15 min
    limit: 30,

    keyGenerator: (req) => String(req.userId),

    standardHeaders: "draft-8",
    legacyHeaders: false,

    handler: rateLimitHandler
});

export { loginLimit, signupLimit, contactsLimit };