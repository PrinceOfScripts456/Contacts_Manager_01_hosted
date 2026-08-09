import Users from "../../models/user.js";

const restoreSession = async (req, res, next) => {
    try {
        const id = req.userId;

        const user = await Users.findById(id);

        if (!user) {
            return res.status(401).json({ error: "Session invalid or Account was deleted" });
        }

        return res.status(200).json({
            user: { id: user._id, username: user.username, email: user.email }
        });

    } catch (err) {
        console.error("Restore session error:", err);
        next(err);
    }
}

export default restoreSession;