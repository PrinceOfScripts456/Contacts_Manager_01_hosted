import mongoose from "mongoose";
import Users from "../../models/user.js";

const deleteUser = async (req, res) => {
    try {
        const id = req.userId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "Invalid user id" });
        }

        if (id !== req.params.id) {
            return res.status(403).json({ error: "access denied: please login first" });
        }

        const deletedUser = await Users.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({
            message: "User deleted successfully",
            user: deletedUser.email
        });

    } catch (err) {
        console.error("Delete user error:", err);
        next(err);
    }
}

export default deleteUser;