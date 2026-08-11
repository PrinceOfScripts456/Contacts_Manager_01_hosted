import jwt from "jsonwebtoken";
import Users from "../../models/user.js";

const login = async (req, res, next) => {

    try {

        const { email, password } = req.body;

        const user = await Users.findOne({ email: email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "3d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        });

        return res.status(200).json({
            user: { id: user._id, username: user.username, email: user.email }
        });

    } catch (err) {
        return next(err);
    }
}

export default login;