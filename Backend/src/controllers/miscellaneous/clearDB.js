import Contact from "../../models/contact.js";

const deleteAllContacts = async (req, res) => {

    try {

        if (req.body.token === process.env.DELETE_Token) {

            const result = await Contact.deleteMany({});

            console.log("deleteAllContacts():", result);

            return res.status(200).json({ deleted: result.deletedCount });
        }
        else {
            console.log("deleteAllContacts(): Access Denied, invalid token");
            return res.status(403).json({ error: "Access denied" });
        }

    } catch (err) {
        console.error("deleteAllContacts(): ", err);
        next(err);
    }
}

export default deleteAllContacts;