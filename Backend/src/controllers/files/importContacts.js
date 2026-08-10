import mongoose from "mongoose";
import Contact from "../../models/contact.js";
import contactSchema from "../../schema/contact.js";
import validateData from "../contacts/validateData.js";

async function importContactsFile(req, res, next) {

    try {

        const fileContent = req.file.buffer.toString("utf-8");

        const jsonData = JSON.parse(fileContent);

        if (!Array.isArray(jsonData)) {
            console.error(" importContactsFile(): uploaded file is not a JSON array");
            return res.status(400).json({ error: "Invalid file format: expected a JSON array of contacts" });
        }

        let isValid = true;

        for (let i = 0; i < jsonData.length; i++) {
            jsonData[i] = validateData(contactSchema, jsonData[i], "silent");

            if (jsonData[i] === false) {
                isValid = false;
                break;
            }
        }

        if (isValid === false) {
            console.error(" importContactsFile(): file contacts validation failed");
            return res.status(400).json({ error: "file contacts validation failed", });
        }

        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const createdContacts = await Contact.bulkWrite(
                jsonData.map(doc => {
                    const { _id, ...data } = doc;

                    return {
                        updateOne: {
                            filter: {
                                _id: _id || new mongoose.Types.ObjectId(),
                                user: req.userId
                            },
                            update: { $set: { ...data, user: req.userId } },
                            upsert: true,
                        }
                    }
                }),
                { session }
            );

            await session.commitTransaction();

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
            await session.abortTransaction();
            throw err;

        } finally {
            await session.endSession();
        }

    } catch (err) {
        console.error(" importContactsFile(): ", err.message || err);

        if (err.code === 11000) {
            return res.status(409).json({
                error: "This file contains contacts that belong to another account and can't be imported here.",
            });
        }
        return next(err);
    }
}


export { importContactsFile };