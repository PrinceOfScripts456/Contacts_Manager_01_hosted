import mongoose from "mongoose";
import Contact from "../../models/contact.js";
import contactSchema from "../../schema/contact.js";
import validateData from "../contacts/validateData.js";

async function importContactsFile(req, res) {

    try {

        const fileContent = req.file.buffer.toString("utf-8");

        const jsonData = JSON.parse(fileContent);

        let isValid = true;

        for (let contact of jsonData) {
            contact = validateData(contactSchema, contact, "silent");

            if (contact === false) {
                isValid = false;
                break;
            }
        }

        if (isValid === false) {
            console.error(" importContactsFile(): file contacts validation failed");
            return res.status(400).json({ error: "file contacts validation failed", });
        }

        // Create new if _id does not exist or update if exist
        const createdContacts = await Contact.bulkWrite(
            jsonData.map(doc => ({
                updateOne: {
                    filter: { _id: doc._id || new mongoose.Types.ObjectId() },
                    update: { $set: doc },
                    upsert: true,
                }
            }))
        );

        console.log(" importContactsFile(): file imported successfuly");
        console.log(`  Updated: ${createdContacts.modifiedCount}`);
        console.log(`  Created: ${createdContacts.upsertedCount}`);
        console.log(`  Remain Same: ${createdContacts.matchedCount - createdContacts.modifiedCount}`);

        return res.status(200).json({
            message: "Contacts file imported successfully",
            updated: createdContacts.modifiedCount,
            created: createdContacts.upsertedCount,
            unchanged: createdContacts.matchedCount - createdContacts.modifiedCount
        });

    } catch (err) {
        console.error(" importContactsFile(): ", err);
        next(new Error("invalid .json file"));
    }
}


export { importContactsFile };