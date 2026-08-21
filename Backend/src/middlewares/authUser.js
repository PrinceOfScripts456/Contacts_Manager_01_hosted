import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {

    let token;
    const cookieToken = req.cookies?.token;
    const authHeader = req.headers.authorization;

    if (cookieToken) {
        token = cookieToken;
    }
    else if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    else {
        return res.status(401).json({ error: 'User not logged in or invalid token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

        if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        req.userId = decoded.id;
        next();
    } catch (err) {
        console.error(" authenticate():", err.message || err);

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired' });
        }
        return res.status(401).json({ error: 'Invalid Session' });
    }
}

export default authenticate;