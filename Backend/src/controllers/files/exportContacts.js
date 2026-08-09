import fs from "fs";
import path from "path";
import Contact from "../../models/contact.js";
import { EXPORT_DIR } from "../../controllers/files/exportPath.js";

const exportContactsFile = async (req, res) => {

    try {
        const contacts = await Contact.find().select("-createdAt -updatedAt -__v").sort({ _id: -1 }).lean();

        if (!contacts.length) {
            console.error(" exportContactsFile(): no contacts found on server");
            return res.status(404).json({ error: 'No contacts found to export' });
        }

        const filename = `contacts-export-${Date.now()}.json`;
        const filePath = path.join(EXPORT_DIR, filename);

        await fs.promises.writeFile(filePath, JSON.stringify(contacts, null, 2));

        const downloadUrl = `/contacts/export/${filename}`;

        console.log(" exportContactsFile():", contacts.length, "contacts exported in file");

        return res.status(200).json({
            exported: contacts.length,
            message: 'Contacts exported successfully',
            fileName: filename,
            downloadUrl,
            filePath
        });

    } catch (err) {
        console.error(" exportContactsFile(): ", err);
        next(err);
    }
};

export { exportContactsFile };