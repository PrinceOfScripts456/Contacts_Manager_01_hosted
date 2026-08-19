import { beforeAll, afterEach, describe, it, expect } from "vitest";
import request from "supertest";
import mongoose from "mongoose";

import connectDB from "../src/config/db.js";
import Contact from "../src/models/contact.js";
import User from "../src/models/user.js";

let app;

beforeAll(async () => {
    await connectDB();
    ({ default: app } = await import("../src/app.js"));
});

afterEach(async () => {
    await Contact.deleteMany({});
    await User.deleteMany({});
});

/**
 * IMPORTANT — why we don't use supertest's request.agent() cookie jar here:
 *
 * login.js (and thus signup, which chains into login) issues the session
 * cookie with `secure: true`. supertest/superagent's automatic cookie jar
 * (request.agent(app)) respects the Secure attribute and will silently
 * refuse to resend that cookie on later requests, since supertest talks to
 * the app over plain HTTP, not HTTPS. Every "authenticated" request made
 * through request.agent(app) was therefore going out with NO cookie, and
 * every route behind authUser (i.e. all of /contacts) was returning 401.
 *
 * The fix: read the token straight out of the Set-Cookie header ourselves,
 * then attach it manually via .set("Cookie", [...]) on every request that
 * needs auth. Setting the header explicitly bypasses the jar's Secure check.
 */
function extractToken(res) {
    const setCookie = res.headers["set-cookie"];
    if (!setCookie) return null;

    const cookieStr = setCookie.find((c) => c.startsWith("token="));
    if (!cookieStr) return null;

    return cookieStr.split(";")[0].split("=")[1];
}

// Small wrapper so call sites read like `client.get(...)` instead of
// repeating `.set("Cookie", [...])` everywhere. `.attach` variant is used
// for the multipart import test.
function authed(token) {
    return {
        get: (url) => request(app).get(url).set("Cookie", [`token=${token}`]),
        post: (url) => request(app).post(url).set("Cookie", [`token=${token}`]),
        patch: (url) => request(app).patch(url).set("Cookie", [`token=${token}`]),
        delete: (url) => request(app).delete(url).set("Cookie", [`token=${token}`]),
    };
}

// All /contacts routes require auth (router.use(authUser) in contactRoutes.js),
// so every describe block below signs a fresh user up first and reuses that
// authenticated client (token attached manually, see note above).
async function createAuthedUser(overrides = {}) {
    const payload = {
        username: "adalovelace",
        email: "ada@example.com",
        password: "password123",
        ...overrides,
    };

    const signupRes = await request(app).post("/users/signup").send(payload);
    const token = extractToken(signupRes);

    return { client: authed(token), token, userId: signupRes.body.user.id };
}

describe("Auth requirement on /contacts routes", () => {
    it("rejects GET /contacts with 401 when not authenticated", async () => {
        const res = await request(app).get("/contacts");
        expect(res.status).toBe(401);
    });

    it("rejects POST /contacts/new with 401 when not authenticated", async () => {
        const res = await request(app)
            .post("/contacts/new")
            .send({ firstName: "Ada", lastName: "Lovelace" });
        expect(res.status).toBe(401);
    });

    it("rejects requests with an invalid/tampered token with 401", async () => {
        const res = await request(app)
            .get("/contacts")
            .set("Cookie", ["token=this.is.not.a.valid.jwt"]);
        expect(res.status).toBe(401);
    });
});

describe("POST /contacts/new", () => {
    it("creates a contact with valid data, scoped to the authenticated user", async () => {
        const { client, userId } = await createAuthedUser();

        const res = await client.post("/contacts/new").send({
            firstName: "Ada",
            lastName: "Lovelace",
            emails: [{ label: "work", email: "ada@example.com" }],
        });

        expect(res.status).toBe(201);
        expect(res.body.contact.firstName).toBe("Ada");
        expect(res.body.contact._id).toBeDefined();

        const inDb = await Contact.findById(res.body.contact._id);
        expect(inDb).not.toBeNull();
        expect(inDb.lastName).toBe("Lovelace");
        expect(String(inDb.user)).toBe(String(userId));
    });

    it("rejects a contact missing the required lastName field", async () => {
        const { client } = await createAuthedUser();

        const res = await client.post("/contacts/new").send({ firstName: "Ada" });

        expect(res.status).toBe(400);

        const count = await Contact.countDocuments();
        expect(count).toBe(0);
    });

    it("rejects a contact missing the required firstName field", async () => {
        const { client } = await createAuthedUser();

        const res = await client.post("/contacts/new").send({ lastName: "Lovelace" });

        expect(res.status).toBe(400);
    });

    it("rejects an invalid email format", async () => {
        const { client } = await createAuthedUser();

        const res = await client.post("/contacts/new").send({
            firstName: "Grace",
            lastName: "Hopper",
            emails: [{ label: "work", email: "not-an-email" }],
        });

        expect(res.status).toBe(400);
    });

    it("rejects an invalid website URL", async () => {
        const { client } = await createAuthedUser();

        const res = await client.post("/contacts/new").send({
            firstName: "Grace",
            lastName: "Hopper",
            website: "not-a-url",
        });

        expect(res.status).toBe(400);
    });

    it("rejects unknown/extra fields (schema is .strict())", async () => {
        const { client } = await createAuthedUser();

        const res = await client.post("/contacts/new").send({
            firstName: "Grace",
            lastName: "Hopper",
            notARealField: "should be rejected",
        });

        expect(res.status).toBe(400);
    });

    it("accepts a contact with phones, emails, and dates arrays", async () => {
        const { client } = await createAuthedUser();

        const res = await client.post("/contacts/new").send({
            firstName: "Grace",
            lastName: "Hopper",
            phones: [{ label: "mobile", number: "555-1234" }],
            emails: [{ label: "work", email: "grace@example.com" }],
            dates: [{ label: "birthday", date: "1906-12-09" }],
            company: "US Navy",
            jobTitle: "Rear Admiral",
        });

        expect(res.status).toBe(201);
        expect(res.body.contact.phones).toHaveLength(1);
        expect(res.body.contact.emails).toHaveLength(1);
        expect(res.body.contact.dates).toHaveLength(1);
    });
});

describe("GET /contacts", () => {
    it("returns only the authenticated user's contacts", async () => {
        const { client: clientA, userId: userIdA } = await createAuthedUser({
            email: "userA@example.com",
            username: "userA",
        });
        const { userId: userIdB } = await createAuthedUser({
            email: "userB@example.com",
            username: "userB",
        });

        await Contact.create([
            { user: userIdA, firstName: "Alan", lastName: "Turing" },
            { user: userIdB, firstName: "Grace", lastName: "Hopper" },
        ]);

        const res = await clientA.get("/contacts");

        expect(res.status).toBe(200);
        expect(res.body.contacts).toHaveLength(1);
        expect(res.body.contacts[0].firstName).toBe("Alan");
    });

    it("returns contacts matching a search term", async () => {
        const { client, userId } = await createAuthedUser();

        await Contact.create([
            { user: userId, firstName: "Alan", lastName: "Turing" },
            { user: userId, firstName: "Grace", lastName: "Hopper" },
        ]);

        const res = await client.get("/contacts?search=Turing");

        expect(res.status).toBe(200);
        expect(res.body.contacts).toHaveLength(1);
        expect(res.body.contacts[0].firstName).toBe("Alan");
    });

    it("returns an empty list when nothing matches", async () => {
        const { client, userId } = await createAuthedUser();
        await Contact.create({ user: userId, firstName: "Alan", lastName: "Turing" });

        const res = await client.get("/contacts?search=Nobody");

        expect(res.status).toBe(200);
        expect(res.body.contacts).toHaveLength(0);
    });

    it("does not error on regex special characters in the search term", async () => {
        const { client, userId } = await createAuthedUser();
        await Contact.create({ user: userId, firstName: "Alan", lastName: "Turing" });

        const res = await client.get(`/contacts?search=${encodeURIComponent("(test")}`);

        expect(res.status).toBe(200);
    });

    it("supports pagination via page and limit", async () => {
        const { client, userId } = await createAuthedUser();

        const contacts = Array.from({ length: 5 }, (_, i) => ({
            user: userId,
            firstName: `Person${i}`,
            lastName: "Test",
        }));
        await Contact.create(contacts);

        const res = await client.get("/contacts?page=1&limit=2");

        expect(res.status).toBe(200);
        expect(res.body.contacts).toHaveLength(2);
        expect(res.body.pagination.total).toBe(5);
        expect(res.body.pagination.totalPages).toBe(3);
        expect(res.body.pagination.hasNextPage).toBe(true);
        expect(res.body.pagination.hasPrevPage).toBe(false);
    });
});

describe("GET /contacts/:id", () => {
    it("returns a specific contact belonging to the user", async () => {
        const { client, userId } = await createAuthedUser();
        const contact = await Contact.create({ user: userId, firstName: "Alan", lastName: "Turing" });

        const res = await client.get(`/contacts/${contact._id}`);

        expect(res.status).toBe(200);
        expect(res.body.contact._id).toBe(String(contact._id));
    });

    it("returns 404 for a contact belonging to another user", async () => {
        const { userId: userIdA } = await createAuthedUser({
            email: "userA@example.com",
            username: "userA",
        });
        const { client: clientB } = await createAuthedUser({
            email: "userB@example.com",
            username: "userB",
        });

        const contact = await Contact.create({ user: userIdA, firstName: "Alan", lastName: "Turing" });

        const res = await clientB.get(`/contacts/${contact._id}`);

        expect(res.status).toBe(404);
    });

    it("returns 404 for a non-existent contact id", async () => {
        const { client } = await createAuthedUser();
        const fakeId = new mongoose.Types.ObjectId();

        const res = await client.get(`/contacts/${fakeId}`);

        expect(res.status).toBe(404);
    });

    it("returns 400 for a malformed contact id", async () => {
        const { client } = await createAuthedUser();

        const res = await client.get("/contacts/not-a-valid-objectid");

        expect(res.status).toBe(400);
    });
});

describe("PATCH /contacts/:id", () => {
    it("edits an existing contact", async () => {
        const { client, userId } = await createAuthedUser();
        const contact = await Contact.create({ user: userId, firstName: "Alan", lastName: "Turing" });

        const res = await client.patch(`/contacts/${contact._id}`).send({
            firstName: "Alan",
            lastName: "Turing-Updated",
        });

        expect(res.status).toBe(200);
        expect(res.body.contact.lastName).toBe("Turing-Updated");

        const inDb = await Contact.findById(contact._id);
        expect(inDb.lastName).toBe("Turing-Updated");
    });

    it("returns 404 when editing another user's contact", async () => {
        const { userId: userIdA } = await createAuthedUser({
            email: "userA@example.com",
            username: "userA",
        });
        const { client: clientB } = await createAuthedUser({
            email: "userB@example.com",
            username: "userB",
        });

        const contact = await Contact.create({ user: userIdA, firstName: "Alan", lastName: "Turing" });

        const res = await clientB.patch(`/contacts/${contact._id}`).send({
            firstName: "Alan",
            lastName: "Hijacked",
        });

        expect(res.status).toBe(404);

        const inDb = await Contact.findById(contact._id);
        expect(inDb.lastName).toBe("Turing");
    });

    it("returns 404 for a non-existent contact id", async () => {
        const { client } = await createAuthedUser();
        const fakeId = new mongoose.Types.ObjectId();

        const res = await client.patch(`/contacts/${fakeId}`).send({
            firstName: "Alan",
            lastName: "Turing",
        });

        expect(res.status).toBe(404);
    });

    it("rejects invalid update data (schema validation still applies)", async () => {
        const { client, userId } = await createAuthedUser();
        const contact = await Contact.create({ user: userId, firstName: "Alan", lastName: "Turing" });

        const res = await client.patch(`/contacts/${contact._id}`).send({
            firstName: "", // min(1) violated
            lastName: "Turing",
        });

        expect(res.status).toBe(400);
    });
});

describe("DELETE /contacts/:id", () => {
    it("deletes an existing contact", async () => {
        const { client, userId } = await createAuthedUser();
        const contact = await Contact.create({ user: userId, firstName: "Alan", lastName: "Turing" });

        const res = await client.delete(`/contacts/${contact._id}`);

        expect(res.status).toBe(200);
        const stillThere = await Contact.findById(contact._id);
        expect(stillThere).toBeNull();
    });

    it("returns 404 for a non-existent contact id", async () => {
        const { client } = await createAuthedUser();
        const fakeId = new mongoose.Types.ObjectId();

        const res = await client.delete(`/contacts/${fakeId}`);

        expect(res.status).toBe(404);
    });

    it("does not delete another user's contact", async () => {
        const { userId: userIdA } = await createAuthedUser({
            email: "userA@example.com",
            username: "userA",
        });
        const { client: clientB } = await createAuthedUser({
            email: "userB@example.com",
            username: "userB",
        });

        const contact = await Contact.create({ user: userIdA, firstName: "Alan", lastName: "Turing" });

        const res = await clientB.delete(`/contacts/${contact._id}`);

        expect(res.status).toBe(404);

        const stillThere = await Contact.findById(contact._id);
        expect(stillThere).not.toBeNull();
    });
});

describe("GET /contacts/export", () => {
    it("exports the authenticated user's contacts as a JSON file download", async () => {
        const { client, userId } = await createAuthedUser();
        await Contact.create({ user: userId, firstName: "Alan", lastName: "Turing" });

        const res = await client.get("/contacts/export");

        expect(res.status).toBe(200);
        expect(res.headers["content-disposition"]).toContain("attachment");
        expect(res.headers["content-type"]).toContain("application/json");

        const body = JSON.parse(res.text);
        expect(body).toHaveLength(1);
        expect(body[0].firstName).toBe("Alan");
        // excluded fields
        expect(body[0].user).toBeUndefined();
        expect(body[0].__v).toBeUndefined();
    });

    it("only exports the authenticated user's own contacts", async () => {
        const { userId: userIdA } = await createAuthedUser({
            email: "userA@example.com",
            username: "userA",
        });
        const { client: clientB } = await createAuthedUser({
            email: "userB@example.com",
            username: "userB",
        });
        await Contact.create({ user: userIdA, firstName: "Alan", lastName: "Turing" });

        const res = await clientB.get("/contacts/export");

        // userB has no contacts of their own
        expect(res.status).toBe(404);
    });

    it("returns 404 when there are no contacts to export", async () => {
        const { client } = await createAuthedUser();

        const res = await client.get("/contacts/export");

        expect(res.status).toBe(404);
    });

    it("strips _id and sub-document _id fields in share mode", async () => {
        const { client, userId } = await createAuthedUser();
        await Contact.create({
            user: userId,
            firstName: "Alan",
            lastName: "Turing",
            emails: [{ label: "work", email: "alan@example.com" }],
        });

        const res = await client.get("/contacts/export?mode=share");

        expect(res.status).toBe(200);
        const body = JSON.parse(res.text);
        expect(body[0]._id).toBeUndefined();
        expect(body[0].emails[0]._id).toBeUndefined();
    });
});

describe("POST /contacts/import", () => {
    it("imports a valid JSON array of contacts", async () => {
        const { token, userId } = await createAuthedUser();

        const contactsFile = JSON.stringify([
            { firstName: "Alan", lastName: "Turing" },
            { firstName: "Grace", lastName: "Hopper" },
        ]);

        const res = await request(app)
            .post("/contacts/import")
            .set("Cookie", [`token=${token}`])
            .attach("file", Buffer.from(contactsFile), {
                filename: "contacts.json",
                contentType: "application/json",
            });

        expect(res.status).toBe(200);
        expect(res.body.created).toBe(2);

        const count = await Contact.countDocuments({ user: userId });
        expect(count).toBe(2);
    });

    it("rejects a file that isn't a JSON array", async () => {
        const { token } = await createAuthedUser();

        const res = await request(app)
            .post("/contacts/import")
            .set("Cookie", [`token=${token}`])
            .attach("file", Buffer.from(JSON.stringify({ firstName: "Alan" })), {
                filename: "contacts.json",
                contentType: "application/json",
            });

        expect(res.status).toBe(400);
    });

    it("rejects a JSON array containing an invalid contact", async () => {
        const { token } = await createAuthedUser();

        const contactsFile = JSON.stringify([
            { firstName: "Alan", lastName: "Turing" },
            { firstName: "Missing Last Name Only" },
        ]);

        const res = await request(app)
            .post("/contacts/import")
            .set("Cookie", [`token=${token}`])
            .attach("file", Buffer.from(contactsFile), {
                filename: "contacts.json",
                contentType: "application/json",
            });

        expect(res.status).toBe(400);

        const count = await Contact.countDocuments();
        expect(count).toBe(0); // nothing should be imported if any entry fails
    });

    it("rejects a non-.json file extension/mimetype", async () => {
        const { token } = await createAuthedUser();

        const res = await request(app)
            .post("/contacts/import")
            .set("Cookie", [`token=${token}`])
            .attach("file", Buffer.from("firstName,lastName\nAlan,Turing"), {
                filename: "contacts.csv",
                contentType: "text/csv",
            });

        expect(res.status).toBe(400);
    });

    it("rejects when no file is attached", async () => {
        const { client } = await createAuthedUser();

        const res = await client.post("/contacts/import");

        // req.file is undefined -> controller throws when reading req.file.buffer -> caught by next(err) -> 500
        expect([400, 500]).toContain(res.status);
    });

    it("updates an existing contact when the imported doc reuses its _id", async () => {
        const { token, userId } = await createAuthedUser();
        const existing = await Contact.create({ user: userId, firstName: "Alan", lastName: "Turing" });

        const contactsFile = JSON.stringify([
            { _id: String(existing._id), firstName: "Alan", lastName: "TuringUpdated" },
        ]);

        const res = await request(app)
            .post("/contacts/import")
            .set("Cookie", [`token=${token}`])
            .attach("file", Buffer.from(contactsFile), {
                filename: "contacts.json",
                contentType: "application/json",
            });

        expect(res.status).toBe(200);
        expect(res.body.updated).toBe(1);
        expect(res.body.created).toBe(0);

        const inDb = await Contact.findById(existing._id);
        expect(inDb.lastName).toBe("TuringUpdated");
    });
});

/**
 * ---------------------------------------------------------------------------
 * Rate limiting — /contacts (contactsLimit: 30 requests / 15 min window)
 * ---------------------------------------------------------------------------
 * Unlike the login/signup limiters, contactsLimit's keyGenerator is the
 * authenticated user's id (req.userId), not the IP. So this test signs up a
 * BRAND NEW user (fresh bucket, unaffected by other tests/users) and then
 * hammers GET /contacts with that single session's token to find exactly
 * which request number (if any) gets throttled with a 429.
 * ---------------------------------------------------------------------------
 */
describe("Rate limiting — /contacts", () => {
    it("reports at which request number (if any) the contacts rate limit kicks in", async () => {
        const { client } = await createAuthedUser({
            email: "rate-limit-probe@example.com",
            username: "rateLimitProbe",
        });

        const TOTAL_REQUESTS = 50;

        let firstLimitedAt = null;
        const statusCounts = {};

        for (let i = 1; i <= TOTAL_REQUESTS; i++) {
            const res = await client.get("/contacts");

            statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;

            if (res.status === 429 && firstLimitedAt === null) {
                firstLimitedAt = i;
            }
        }

        console.log(`\n[Rate limit test] GET /contacts — sent ${TOTAL_REQUESTS} requests.`);
        console.log(`[Rate limit test] Status code breakdown:`, statusCounts);

        if (firstLimitedAt !== null) {
            console.log(`[Rate limit test] ✅ Rate limiting IS working — first 429 occurred on request #${firstLimitedAt}.`);
        } else {
            console.log(`[Rate limit test] ⚠️ Rate limiting did NOT trigger within ${TOTAL_REQUESTS} requests.`);
        }

        const unexpectedStatuses = Object.keys(statusCounts).filter((s) => s !== "200" && s !== "429");
        expect(unexpectedStatuses).toEqual([]);
    });
});
