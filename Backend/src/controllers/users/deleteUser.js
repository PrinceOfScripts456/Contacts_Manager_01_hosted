import mongoose from "mongoose";
import User from "../../models/user.js";
import Contact from "../../models/contact.js";

const deleteUser = async (req, res, next) => {
    try {
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const { deletedCount } = await Contact.deleteMany({ user: userId });

        return res.status(200).json({
            message: "User and their contacts deleted successfully",
            user: deletedUser.email,
            contacts: deletedCount
        });

    } catch (err) {
        console.error("Delete user error:", err);
        next(err);
    }
}

export default deleteUser;