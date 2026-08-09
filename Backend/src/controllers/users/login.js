import jwt from "jsonwebtoken";
import Users from "../../models/user.js";

const createToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await Users.findOne({ email: email });
        if (!user) {
            return res.status(401).json({ success: false, error: "Invalid email or password" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = createToken(user._id);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(200).json({
            success: true,
            user: { id: user._id, username: user.username, email: user.email }
        });

    } catch (err) {
        next(err);
    }
}

export default login;