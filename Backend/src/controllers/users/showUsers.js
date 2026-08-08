import Users from "../../models/user.js";

const showAllUsers = async (req, res) => {
    try {
        const users = await Users.find();

        return res.status(200).json({
            success: true,
            users: users
        });

    } catch (err) {
        console.log(" showAllUsers(): ", err.message);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        })
    }
}

export default showAllUsers;