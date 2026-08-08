import express from "express";
const router = express.Router();

// Middlewares
import contactSchema from "../schema/contact.js";
import validate from "../middlewares/validateContact.js";
import validateFile from "../middlewares/validateFile.js";

// Route controllers
import { fetchContacts } from "../controllers/contacts/allContacts.js";
import { viewContactById } from "../controllers/contacts/viewContact.js";
import { saveContact } from "../controllers/contacts/newContact.js";
import { updateContact } from "../controllers/contacts/editContact.js";
import { deleteContactById } from "../controllers/contacts/deleteContact.js";
import { exportContactsFile } from "../controllers/files/exportContacts.js";
import { downloadExportFile } from "../controllers/files/downloadExport.js";
import { importContactsFile } from "../controllers/files/importContacts.js";

// Stats
import { showRoutes } from "../utils/utils.js";

// Miscellaneous
import clearDB from "../controllers/miscellaneous/clearDB.js";

router.delete("/dev", showRoutes, clearDB);

router.get("/", showRoutes, fetchContacts);
router.get("/export", showRoutes, exportContactsFile);
router.get("/export/:filename", showRoutes, downloadExportFile);
router.get("/:id", showRoutes, viewContactById);

router.post("/new", showRoutes, validate(contactSchema), saveContact);
router.post("/import", showRoutes, validateFile, importContactsFile);

router.put("/:id", showRoutes, validate(contactSchema), updateContact);
router.delete("/:id", showRoutes, deleteContactById);


export default router;


/**
 * Routes:
 * GET    /contacts         ← fetch all contacts
 * POST   /contacts/new     ← create contact
 * GET    /contacts/:id     ← view specific contact
 * PUT    /contacts/:id     ← edit contact
 * DELETE /contacts/:id     ← delete contact
 * GET    /contacts/export      ← export file
 * GET    /contacts/export/:fn  ← export file download
 * POST   /contacts/import      ← import file
 */