import { beforeAll, afterEach, describe, it, expect } from "vitest";
import request from "supertest";
import mongoose from "mongoose";

import connectDB from "../src/config/db.js";
import Contact from "../src/models/contact.js";

let app;

beforeAll(async () => {
    await connectDB();
    ({ default: app } = await import("../src/app.js"));
});

afterEach(async () => {
    await Contact.deleteMany({});
});

describe("POST /contacts/new", () => {
    it("creates a contact with valid data", async () => {
        const res = await request(app)
            .post("/contacts/new")
            .send({
                firstName: "Ada",
                lastName: "Lovelace",
                emails: [{ label: "work", email: "ada@example.com" }],
            });

        expect(res.status).toBe(201);
        expect(res.body.contact.firstName).toBe("Ada");
        expect(res.body.contact._id).toBeDefined();

        // Confirm it actually landed in the database, not just in the response.
        const inDb = await Contact.findById(res.body.contact._id);
        expect(inDb).not.toBeNull();
        expect(inDb.lastName).toBe("Lovelace");
    });

    it("rejects a contact missing the required lastName field", async () => {
        const res = await request(app)
            .post("/contacts/new")
            .send({ firstName: "Ada" }); // lastName is required by the Zod schema

        expect(res.status).toBe(400);

        const count = await Contact.countDocuments();
        expect(count).toBe(0); // nothing should have been saved
    });

    it("rejects an invalid email format", async () => {
        const res = await request(app)
            .post("/contacts/new")
            .send({
                firstName: "Grace",
                lastName: "Hopper",
                emails: [{ label: "work", email: "not-an-email" }],
            });

        expect(res.status).toBe(400);
    });

    it("rejects unknown/extra fields (schema is .strict())", async () => {
        const res = await request(app)
            .post("/contacts/new")
            .send({
                firstName: "Grace",
                lastName: "Hopper",
                notARealField: "should be rejected",
            });

        expect(res.status).toBe(400);
    });
});

describe("GET /contacts", () => {
    it("returns contacts matching a search term", async () => {
        await Contact.create([
            { firstName: "Alan", lastName: "Turing" },
            { firstName: "Grace", lastName: "Hopper" },
        ]);

        const res = await request(app).get("/contacts").query({ search: "Turing" });

        expect(res.status).toBe(200);
        expect(res.body.contacts).toHaveLength(1);
        expect(res.body.contacts[0].firstName).toBe("Alan");
    });

    it("returns an empty list when nothing matches", async () => {
        await Contact.create({ firstName: "Alan", lastName: "Turing" });

        const res = await request(app).get("/contacts").query({ search: "Nobody" });

        expect(res.status).toBe(200);
        expect(res.body.contacts).toHaveLength(0);
    });

    it("does not error on regex special characters in the search term", async () => {
        // Guards the escapeRegex() logic in allContacts.js — a raw
        // unescaped "(" would otherwise crash MongoDB's regex engine.
        await Contact.create({ firstName: "Alan", lastName: "Turing" });

        const res = await request(app).get("/contacts").query({ search: "(test" });

        expect(res.status).toBe(200);
    });
});

describe("DELETE /contacts/:id", () => {
    it("deletes an existing contact", async () => {
        const contact = await Contact.create({ firstName: "Alan", lastName: "Turing" });

        const res = await request(app).delete(`/contacts/${contact._id}`);

        expect(res.status).toBe(200);
        const stillThere = await Contact.findById(contact._id);
        expect(stillThere).toBeNull();
    });

    it("returns 404 for a non-existent contact id", async () => {
        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app).delete(`/contacts/${fakeId}`);

        expect(res.status).toBe(404);
    });
});
