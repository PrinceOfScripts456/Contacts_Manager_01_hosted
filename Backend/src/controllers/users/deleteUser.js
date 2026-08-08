import mongoose from "mongoose";
import Users from "../../models/user.js";

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "Invalid user id" });
        }

        const deletedUser = await Users.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
            user: { email: deletedUser.email }
        });

    } catch (err) {
        console.error("Delete user error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default deleteUser;