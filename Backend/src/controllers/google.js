import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import Users from "../../models/user.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleAuth = async (req, res, next) => {

    try {
        const { credential } = req.body; // the ID token sent from frontend

        if (!credential) {
            return res.status(400).json({ error: "Missing Google credential" });
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name } = payload;

        let user = await Users.findOne({ email });

        if (user) {
            // Existing account (whether local or google) — link/allow Google login on it
            if (user.provider === "local" && !user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            user = await Users.create({
                username: name || email.split("@")[0],
                email,
                provider: "google",
                googleId
            });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "3d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 3 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            user: { id: user._id, username: user.username, email: user.email }
        });

    } catch (err) {
        console.error("Google auth error:", err.message);
        return res.status(401).json({ error: "Invalid Google credential" });
    }
};

export default googleAuth;