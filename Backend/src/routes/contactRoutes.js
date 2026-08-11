import express from "express";
const router = express.Router();

// Middlewares
import contactSchema from "../schema/contact.js";
import validate from "../middlewares/validateContact.js";
import validateFile from "../middlewares/validateFile.js";
import authUser from "../middlewares/authUser.js";
import { contactsLimit } from "../middlewares/rateLimiter.js";

// Route controllers
import { fetchContacts } from "../controllers/contacts/allContacts.js";
import { viewContactById } from "../controllers/contacts/viewContact.js";
import { saveContact } from "../controllers/contacts/newContact.js";
import { updateContact } from "../controllers/contacts/editContact.js";
import { deleteContactById } from "../controllers/contacts/deleteContact.js";
import { exportContactsFile } from "../controllers/files/exportContacts.js";
import { importContactsFile } from "../controllers/files/importContacts.js";

// Stats
import { showRoutes } from "../utils/utils.js";

router.use(authUser);
router.use(contactsLimit);

router.get("/", showRoutes, fetchContacts);
router.get("/export", showRoutes, exportContactsFile);
router.get("/:id", showRoutes, viewContactById);

router.post("/new", showRoutes, validate(contactSchema), saveContact);
router.post("/import", showRoutes, validateFile, importContactsFile);

router.patch("/:id", showRoutes, validate(contactSchema), updateContact);
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