import Users from "../../models/user.js";

const createUser = async (req, res) => {
    try {
        const user = {
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
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

export default createUser;