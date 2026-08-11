import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Users from "../../models/user.js";

const updateUser = async (req, res, next) => {
    try {
        const id = req.userId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const user = await Users.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const { username, email, currentPassword, newPassword } = req.body;

        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: "Current password is required to set a new password" });
            }

            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({ error: "Current password is incorrect" });
            }

            user.password = await bcrypt.hash(newPassword, 10);
        }

        if (username !== undefined) user.username = username;
        if (email !== undefined) user.email = email;

        await user.save();

        return res.status(200).json({
            message: "Profile updated successfully",
            user: { id: user._id, username: user.username, email: user.email }
        });

    } catch (err) {
        console.error("Update user error:", err.message || err);

        if (err.code === 11000) {
            return res.status(409).json({ error: "Email already in use" });
        }
        return next(err);
    }
};

export default updateUser;