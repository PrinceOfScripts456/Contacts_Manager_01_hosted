import bcrypt from "bcrypt";

const hashPassword = async (req, res, next) => {

    try {
        req.body.password = await bcrypt.hash(req.body.password, 10);
        return next();

    } catch (err) {
        console.error("Password hashing error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default hashPassword;