import mongoose from "mongoose";
import Contact from "../../models/contact.js";

const viewContactById = async (req, res, next) => {

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.error(" viewContactById(): invalid contact id");
            return res.status(400).json({ message: "Invalid contact ID." });
        }

        const contact = await Contact.findOne({ _id: req.params.id, user: req.userId });

        if (!contact) {
            console.error(" viewContactById(): Contact not found.");
            return res.status(404).json({ message: "Contact not found." });
        }

        console.log(" viewContactById(): Contact found and sent");
        return res.status(200).json({ contact });

    } catch (err) {
        console.error(" viewContactById(): ", err.message || err);
        return next(err);
    }
};

export { viewContactById };