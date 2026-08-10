import Contact from "../../models/contact.js";
import contactSchema from "../../schema/contact.js";
import validateData from "./validateData.js";

async function saveContact(req, res, next) {

    try {
        const now = Date.now();

        let data = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phones: req.body.phones || [],   // [{ label, number }]
            emails: req.body.emails || [],   // [{ label, email }]
            dates: req.body.dates || [],     // [{ label, date }]
            note: req.body.note,
            avatar: req.body.avatar,
            website: req.body.website,
            address: req.body.address,
            company: req.body.company,
            jobTitle: req.body.jobTitle,
            created_at: now,
            modified_at: now
        };

        data = validateData(contactSchema, data);

        if (data === false) {
            console.error("  saveContact(): contact NOT saved.");
            return res.status(400).json({ message: "data validation failed, contact not saved." });
        }

        const savedContact = await Contact.create({ ...data, user: req.userId });

        console.log("  saveContact(): contact saved");

        return res.status(201).json({
            contact: savedContact,
            message: "New contact saved successfully"
        });

    } catch (err) {
        console.error(" saveContact(): ", err.message || err);
        next(err);
    }
}

export { saveContact };