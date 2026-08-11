import Contact from "../../models/contact.js";

const exportContactsFile = async (req, res, next) => {

    try {
        const excludeFields = req.query.mode === "share" ?
            "-user -createdAt -updatedAt -__v -_id -phones._id -emails._id -dates._id" :
            "-user -createdAt -updatedAt -__v";

        const contacts = await Contact.find({ user: req.userId })
            .select(excludeFields)
            .sort({ _id: -1 })
            .lean();

        if (!contacts.length) {
            console.error(" exportContactsFile(): no contacts found on server");
            return res.status(404).json({ error: 'No contacts found to export' });
        }

        const filename = `contacts-export-${Date.now()}.json`;
        const jsonContacts = JSON.stringify(contacts, null, 2);

        console.log(" exportContactsFile():", contacts.length, "contacts exported in file");

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("message", `${contacts.length} contacts exported successfully`);
        return res.status(200).send(jsonContacts);

    } catch (err) {
        console.error(" exportContactsFile(): ", err.message || err);
        return next(err);
    }
};

export { exportContactsFile };