import bcrypt from "bcrypt";
import Users from "../../models/user.js";

const signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);

        const user = {
            username,
            email,
            password: hashedPassword
        }

        const createdUser = await Users.create(user);

        console.log("User Created: ", createdUser.email);
        next();

    } catch (err) {
        console.error("Signup error:", err.message || err);

        if (err.code === 11000) {
            return res.status(409).json({ error: "Email already in use" });
        }
        return next(err);
    }
}

export default signup;