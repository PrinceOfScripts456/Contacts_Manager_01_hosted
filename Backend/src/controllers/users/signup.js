import bcrypt from "bcrypt";
import Users from "../../models/user.js";

const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            username,
            email,
            password: hashedPassword
        }

        const createdUser = await Users.create(user);

        console.log("User Created: ", createdUser);

        return res.status(201).json({
            success: true,
            message: "user created"
        });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: "Email already in use" });
        }
        console.error("Signup error:", err.message);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default signup;