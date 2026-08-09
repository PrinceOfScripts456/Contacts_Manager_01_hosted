import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

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
        return res.status(401).json({
            error: 'User not logged in or invalid token'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired' });
        }
        return res.status(401).json({ error: 'Invalid Session' });
    }
}

export default authenticate;