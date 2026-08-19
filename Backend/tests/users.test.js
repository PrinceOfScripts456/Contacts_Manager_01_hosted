import { beforeAll, afterEach, describe, it, expect } from "vitest";
import request from "supertest";

import connectDB from "../src/config/db.js";
import User from "../src/models/user.js";
import Contact from "../src/models/contact.js";

let app;

beforeAll(async () => {
    await connectDB();
    ({ default: app } = await import("../src/app.js"));
});

afterEach(async () => {
    await User.deleteMany({});
    await Contact.deleteMany({});
});

/**
 * IMPORTANT — why we don't use supertest's request.agent() cookie jar here:
 *
 * login.js issues the session cookie with `secure: true` (cookie is marked
 * Secure). supertest/superagent's automatic cookie jar (request.agent(app))
 * respects the Secure attribute and will silently refuse to resend that
 * cookie on later requests, because supertest talks to the app over plain
 * HTTP, not HTTPS. That means every "authenticated" request made through
 * request.agent(app) was actually going out with NO cookie at all, and
 * every route behind authUser was returning 401.
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
// repeating `.set("Cookie", [...])` everywhere.
function authed(token) {
    return {
        get: (url) => request(app).get(url).set("Cookie", [`token=${token}`]),
        post: (url) => request(app).post(url).set("Cookie", [`token=${token}`]),
        patch: (url) => request(app).patch(url).set("Cookie", [`token=${token}`]),
        delete: (url) => request(app).delete(url).set("Cookie", [`token=${token}`]),
    };
}

// Signs a user up and returns both the raw response and a ready-to-use
// authed() client carrying that user's token.
async function signupAndLogin(overrides = {}) {
    const payload = {
        username: "adalovelace",
        email: "ada@example.com",
        password: "password123",
        ...overrides,
    };

    const res = await request(app).post("/users/signup").send(payload);
    const token = extractToken(res);

    return { res, token, client: authed(token) };
}

describe("POST /users/signup", () => {
    it("creates a new user and logs them in (sets cookie) with valid data", async () => {
        const res = await request(app).post("/users/signup").send({
            username: "adalovelace",
            email: "ada@example.com",
            password: "password123",
        });

        // signup -> next() -> login controller responds, so it behaves like login
        expect(res.status).toBe(200);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe("ada@example.com");
        expect(res.body.user.username).toBe("adalovelace");
        expect(res.body.user.id).toBeDefined();
        // password must never be echoed back
        expect(res.body.user.password).toBeUndefined();

        // a session cookie should have been issued
        const setCookie = res.headers["set-cookie"];
        expect(setCookie).toBeDefined();
        expect(setCookie.some((c) => c.startsWith("token="))).toBe(true);

        // user actually persisted, with a hashed (not plaintext) password
        const inDb = await User.findOne({ email: "ada@example.com" });
        expect(inDb).not.toBeNull();
        expect(inDb.password).not.toBe("password123");
    });

    it("rejects a duplicate email with 409", async () => {
        await signupAndLogin();

        const res = await request(app).post("/users/signup").send({
            username: "someoneelse",
            email: "ada@example.com", // same email
            password: "password456",
        });

        expect(res.status).toBe(409);
        expect(res.body.error).toBeDefined();

        const count = await User.countDocuments();
        expect(count).toBe(1);
    });

    it("rejects a username shorter than 3 characters", async () => {
        const res = await request(app).post("/users/signup").send({
            username: "ab",
            email: "short@example.com",
            password: "password123",
        });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });

    it("rejects a username longer than 30 characters", async () => {
        const res = await request(app).post("/users/signup").send({
            username: "a".repeat(31),
            email: "long@example.com",
            password: "password123",
        });

        expect(res.status).toBe(400);
    });

    it("rejects an invalid email format", async () => {
        const res = await request(app).post("/users/signup").send({
            username: "validname",
            email: "not-an-email",
            password: "password123",
        });

        expect(res.status).toBe(400);
    });

    it("rejects a password shorter than 8 characters", async () => {
        const res = await request(app).post("/users/signup").send({
            username: "validname",
            email: "shortpw@example.com",
            password: "short1",
        });

        expect(res.status).toBe(400);
    });

    it("rejects a password longer than 72 characters", async () => {
        const res = await request(app).post("/users/signup").send({
            username: "validname",
            email: "longpw@example.com",
            password: "a".repeat(73),
        });

        expect(res.status).toBe(400);
    });

    it("rejects missing required fields", async () => {
        const res = await request(app).post("/users/signup").send({
            email: "missing@example.com",
            password: "password123",
        });

        expect(res.status).toBe(400);
    });

    it("rejects unknown/extra fields (schema is .catchall(z.never()))", async () => {
        const res = await request(app).post("/users/signup").send({
            username: "validname",
            email: "extra@example.com",
            password: "password123",
            isAdmin: true,
        });

        expect(res.status).toBe(400);

        const count = await User.countDocuments();
        expect(count).toBe(0);
    });

    it("normalizes email to lowercase and trims whitespace", async () => {
        const res = await request(app).post("/users/signup").send({
            username: "  spacey  ",
            email: "  MixedCase@Example.com  ",
            password: "password123",
        });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("mixedcase@example.com");
        expect(res.body.user.username).toBe("spacey");
    });
});

describe("POST /users/login", () => {
    it("logs in with correct credentials and sets a session cookie", async () => {
        await signupAndLogin(); // creates ada@example.com / password123

        const res = await request(app).post("/users/login").send({
            email: "ada@example.com",
            password: "password123",
        });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("ada@example.com");

        const setCookie = res.headers["set-cookie"];
        expect(setCookie.some((c) => c.startsWith("token="))).toBe(true);
    });

    it("rejects a login for a non-existent email with 401", async () => {
        const res = await request(app).post("/users/login").send({
            email: "nobody@example.com",
            password: "password123",
        });

        expect(res.status).toBe(401);
    });

    it("rejects a login with the wrong password with 401", async () => {
        await signupAndLogin();

        const res = await request(app).post("/users/login").send({
            email: "ada@example.com",
            password: "wrongpassword",
        });

        expect(res.status).toBe(401);
    });

    it("rejects a malformed email", async () => {
        const res = await request(app).post("/users/login").send({
            email: "not-an-email",
            password: "password123",
        });

        expect(res.status).toBe(400);
    });

    it("rejects a login missing the password field", async () => {
        const res = await request(app).post("/users/login").send({
            email: "ada@example.com",
        });

        expect(res.status).toBe(400);
    });

    it("does not leak whether the account exists via the error message", async () => {
        await signupAndLogin();

        const wrongPassRes = await request(app).post("/users/login").send({
            email: "ada@example.com",
            password: "wrongpassword",
        });
        const noAccountRes = await request(app).post("/users/login").send({
            email: "nobody@example.com",
            password: "wrongpassword",
        });

        expect(wrongPassRes.body.error).toBe(noAccountRes.body.error);
    });
});

describe("POST /users/logout", () => {
    it("clears the session cookie when logged in", async () => {
        const { client } = await signupAndLogin();

        const res = await client.post("/users/logout");

        expect(res.status).toBe(200);

        const setCookie = res.headers["set-cookie"];
        expect(setCookie).toBeDefined();
        // clearCookie sends an expired token cookie
        expect(setCookie.some((c) => c.startsWith("token=;") || c.includes("token=;"))).toBe(true);
    });

    it("rejects logout with 401 when not authenticated", async () => {
        const res = await request(app).post("/users/logout");

        expect(res.status).toBe(401);
    });

    it("rejects logout with 401 when the token is invalid/tampered", async () => {
        const res = await request(app)
            .post("/users/logout")
            .set("Cookie", ["token=this.is.not.a.valid.jwt"]);

        expect(res.status).toBe(401);
    });
});

describe("GET /users/restoreSession", () => {
    it("returns the current user when a valid session cookie is present", async () => {
        const { client } = await signupAndLogin();

        const res = await client.get("/users/restoreSession");

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("ada@example.com");
    });

    it("rejects with 401 when there is no session cookie", async () => {
        const res = await request(app).get("/users/restoreSession");

        expect(res.status).toBe(401);
    });

    it("rejects with 401 when the token is invalid/tampered", async () => {
        const res = await request(app)
            .get("/users/restoreSession")
            .set("Cookie", ["token=this.is.not.a.valid.jwt"]);

        expect(res.status).toBe(401);
    });

    it("rejects with 401 when the user behind a valid token was deleted", async () => {
        const { client } = await signupAndLogin();

        // Wipe the user out from under the still-valid token
        await User.deleteMany({});

        const res = await client.get("/users/restoreSession");

        expect(res.status).toBe(401);
    });

    it("also accepts the token via an Authorization: Bearer header", async () => {
        const { token } = await signupAndLogin();

        const res = await request(app)
            .get("/users/restoreSession")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("ada@example.com");
    });
});

describe("PATCH /users/me", () => {
    it("rejects with 401 when not authenticated", async () => {
        const res = await request(app).patch("/users/me").send({ username: "newname" });

        expect(res.status).toBe(401);
    });

    it("updates the username", async () => {
        const { client } = await signupAndLogin();

        const res = await client.patch("/users/me").send({ username: "newname" });

        expect(res.status).toBe(200);
        expect(res.body.user.username).toBe("newname");

        const inDb = await User.findOne({ email: "ada@example.com" });
        expect(inDb.username).toBe("newname");
    });

    it("updates the email", async () => {
        const { client } = await signupAndLogin();

        const res = await client.patch("/users/me").send({ email: "newemail@example.com" });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("newemail@example.com");
    });

    it("rejects updating to an email already used by another account (409)", async () => {
        await signupAndLogin({ email: "taken@example.com", username: "firstuser" });
        const { client } = await signupAndLogin({ email: "ada@example.com", username: "seconduser" });

        const res = await client.patch("/users/me").send({ email: "taken@example.com" });

        expect(res.status).toBe(409);
    });

    it("changes the password when currentPassword is correct", async () => {
        const { client } = await signupAndLogin();

        const res = await client.patch("/users/me").send({
            currentPassword: "password123",
            newPassword: "brandnewpassword",
        });

        expect(res.status).toBe(200);

        // old password should no longer work
        const oldLogin = await request(app).post("/users/login").send({
            email: "ada@example.com",
            password: "password123",
        });
        expect(oldLogin.status).toBe(401);

        // new password should work
        const newLogin = await request(app).post("/users/login").send({
            email: "ada@example.com",
            password: "brandnewpassword",
        });
        expect(newLogin.status).toBe(200);
    });

    it("rejects a password change without currentPassword", async () => {
        const { client } = await signupAndLogin();

        const res = await client.patch("/users/me").send({
            newPassword: "brandnewpassword",
        });

        expect(res.status).toBe(400);
    });

    it("rejects a password change when currentPassword is wrong", async () => {
        const { client } = await signupAndLogin();

        const res = await client.patch("/users/me").send({
            currentPassword: "wrongpassword",
            newPassword: "brandnewpassword",
        });

        expect(res.status).toBe(401);
    });

    it("rejects unknown/extra fields (schema is .catchall(z.never()))", async () => {
        const { client } = await signupAndLogin();

        const res = await client.patch("/users/me").send({ isAdmin: true });

        expect(res.status).toBe(400);
    });

    it("accepts an empty body as a no-op update", async () => {
        const { client } = await signupAndLogin();

        const res = await client.patch("/users/me").send({});

        expect(res.status).toBe(200);
        expect(res.body.user.username).toBe("adalovelace");
    });
});

describe("DELETE /users/me", () => {
    it("rejects with 401 when not authenticated", async () => {
        const res = await request(app).delete("/users/me");

        expect(res.status).toBe(401);
    });

    it("deletes the authenticated user and their contacts", async () => {
        const { client, res: signupRes } = await signupAndLogin();
        const userId = signupRes.body.user.id;

        await Contact.create([
            { user: userId, firstName: "A", lastName: "One" },
            { user: userId, firstName: "B", lastName: "Two" },
        ]);

        const res = await client.delete("/users/me");

        expect(res.status).toBe(200);
        expect(res.body.contacts).toBe(2);

        const userInDb = await User.findById(userId);
        expect(userInDb).toBeNull();

        const remainingContacts = await Contact.countDocuments({ user: userId });
        expect(remainingContacts).toBe(0);
    });

    it("does not delete other users' contacts", async () => {
        const { client: clientA, res: resA } = await signupAndLogin({
            email: "userA@example.com",
            username: "userA",
        });
        const { res: resB } = await signupAndLogin({
            email: "userB@example.com",
            username: "userB",
        });

        await Contact.create({ user: resA.body.user.id, firstName: "A", lastName: "Contact" });
        await Contact.create({ user: resB.body.user.id, firstName: "B", lastName: "Contact" });

        await clientA.delete("/users/me");

        const remaining = await Contact.countDocuments({ user: resB.body.user.id });
        expect(remaining).toBe(1);
    });

    it("clears the session cookie after deletion", async () => {
        const { client } = await signupAndLogin();

        const res = await client.delete("/users/me");

        const setCookie = res.headers["set-cookie"];
        expect(setCookie.some((c) => c.startsWith("token=;") || c.includes("token=;"))).toBe(true);
    });
});

/**
 * ---------------------------------------------------------------------------
 * Rate limiting — POST /users/login (loginLimit: 10 requests / 30 min window)
 * ---------------------------------------------------------------------------
 * NOTE: express-rate-limit's default keyGenerator uses the request IP.
 * All requests from supertest originate from the same IP, so they share
 * one bucket. This test runs LAST in the file (after all other login tests
 * above already consumed some of the login-attempts quota) — see the
 * console output for exactly which request number gets throttled.
 *
 * IMPORTANT: because the counter is shared across every test in this file
 * (IP-based, never reset between tests), the number of PRIOR logins in this
 * file eats into the limit before this test even starts. To get a clean,
 * deterministic reading of "at what request number does throttling kick
 * in", this test fires a fresh burst of requests and simply reports where
 * (if anywhere) a 429 shows up.
 * ---------------------------------------------------------------------------
 */
describe("Rate limiting — POST /users/login", () => {
    it("reports at which request number (if any) the login rate limit kicks in", async () => {
        const TOTAL_REQUESTS = 50;

        let firstLimitedAt = null;
        const statusCounts = {};

        for (let i = 1; i <= TOTAL_REQUESTS; i++) {
            const res = await request(app).post("/users/login").send({
                email: "rate-limit-probe@example.com",
                password: "password123",
            });

            statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;

            if (res.status === 429 && firstLimitedAt === null) {
                firstLimitedAt = i;
            }
        }

        console.log(`\n[Rate limit test] POST /users/login — sent ${TOTAL_REQUESTS} requests.`);
        console.log(`[Rate limit test] Status code breakdown:`, statusCounts);

        if (firstLimitedAt !== null) {
            console.log(`[Rate limit test] ✅ Rate limiting IS working — first 429 occurred on request #${firstLimitedAt}.`);
        } else {
            console.log(`[Rate limit test] ⚠️ Rate limiting did NOT trigger within ${TOTAL_REQUESTS} requests.`);
        }

        // This test is a diagnostic/reporting tool, not a strict pass/fail gate on
        // a specific limit number (you said you'll tune limits yourself). It only
        // asserts that every response was either a normal auth response (401 for
        // bad creds) or the expected 429 once throttled — i.e. nothing crashed.
        const unexpectedStatuses = Object.keys(statusCounts).filter(
            (s) => s !== "401" && s !== "429" && s !== "400"
        );
        expect(unexpectedStatuses).toEqual([]);
    });
});
