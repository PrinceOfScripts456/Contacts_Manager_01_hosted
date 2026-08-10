import Contact from "../../models/contact.js";
import contactSchema from "../../schema/contact.js";
import validateData from "./validateData.js";

async function updateContact(req, res, next) {

    try {

        let data = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phones: req.body.phones || [],
            emails: req.body.emails || [],
            dates: req.body.dates || [],
            note: req.body.note,
            avatar: req.body.avatar,
            website: req.body.website,
            address: req.body.address,
            company: req.body.company,
            jobTitle: req.body.jobTitle,
            modified_at: Date.now(),
        };

        data = validateData(contactSchema, data);

        if (data === false) {
            console.error("  updateContact(): validation failed");
            return res.status(400).json({ error: "validation failed" });
        }

        const editedContact = await Contact.findOneAndUpdate({ _id: req.params.id, user: req.userId }, data, { returnDocument: 'after' });

        if (!editedContact) {
            console.log("  updateContact(): contact not found");
            return res.status(404).json({ error: "Contact not found", });
        }

        console.log("  updateContact(): contact updated");

        return res.status(200).json({
            contact: editedContact,
            message: "Contact edited successfully"
        });

    } catch (err) {
        console.error(" updateContact(): ", err.message || err);
        return next(err);
    }
}

export { updateContact };