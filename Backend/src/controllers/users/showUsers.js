import Users from "../../models/user.js";

const showAllUsers = async (req, res) => {
    try {
        const users = await Users.find();

        return res.status(200).json({ users });

    } catch (err) {
        console.log(" showAllUsers(): ", err.message);
        next(err);
    }
}

export default showAllUsers;