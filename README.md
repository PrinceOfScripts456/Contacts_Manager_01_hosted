# Contacts Manager

A full-stack contacts manager with a React frontend and an Express/MongoDB REST API. Add, edit, search, and organize contacts with multiple phone numbers, emails, and dates per contact, then bulk import/export your data as JSON.

## Features

- **Accounts** — signup/login with hashed passwords, sessions kept in an httpOnly JWT cookie (not accessible to frontend JS), account settings (change username/email/password, delete account)
- **Full CRUD** — create, view, edit, and delete contacts, scoped per-user
- **Rich contact fields** — multiple labeled phone numbers, emails, and dates per contact, plus company, job title, website, address, and notes
- **Search** — server-side search, so filtering happens on the backend rather than in the browser
- **Multiple views** — card, compact, and full list layouts, with pagination
- **Import / Export** — bulk import contacts from a `.json` file, export all contacts to a downloadable `.json` file
- **Light/dark theme**
- **Server-side validation** — requests validated with [Zod](https://zod.dev/) before hitting the database
- **Rate limiting** — login and signup are rate-limited against brute-force attempts

> **Note:** avatar photo upload has UI support on the frontend, but the backend endpoint for it isn't implemented yet.

## Tech Stack

**Frontend:** React 19, React Router, Vite, Axios  
**Backend:** Node.js, Express 5, MongoDB with Mongoose, Zod, JWT + bcrypt, Multer, EJS

## Getting Started

### Prerequisites
- Node.js
- A MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Backend setup

```bash
cd Backend
npm install
```

Create a `.env` file in `Backend/`:

```bash
PORT=5000
MONGO_URI=mongodb_connection_string
FRONTEND_URLS=link_1,link_2         # comma-separated, whitelisted origins for CORS
JWT_SECRET=a_long_random_secret     # signs/verifies login session tokens — required
```

`JWT_SECRET` should be a long, random string kept out of version control. Anyone with this value can forge valid login sessions, so use a fresh one per environment (dev/staging/production) and never commit it.

Start the server:

```bash
npm start
```

### Frontend setup

```bash
cd Frontend
npm install
```

Create a `.env` file in `Frontend/` if your backend isn't on the default port:

```bash
VITE_API_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev
```

## Screenshots

**Home Page View 1:**

<p align="center">
<img src="./others/screenshots/View_1.jpg" width="320px">
</p>

<hr>

**Home Page View 2:**

<p align="center">
<img src="./others/screenshots/View_2.jpg" width="320px">
</p>

<hr>

**Home Page View 3:**

<p align="center">
<img src="./others/screenshots/View_3.jpg" width="320px">
</p>

<hr>

**Page Navigation:**

<p align="center">
<img src="./others/screenshots/PageEnd.jpg" width="320px">
</p>

<hr>

**Search View (Result Found):**

<p align="center">
<img src="./others/screenshots/Search.jpg" width="320px">
</p>

<hr>

**Search View (No Result Found):**

<p align="center">
<img src="./others/screenshots/NoResult.jpg" width="320px">
</p>

<hr>

**Create New Contact Page:**

<p align="center">
<img src="./others/screenshots/NewContact.jpg" width="320px">
</p>

<hr>

**Contact Details Page:**

<p align="center">
<img src="./others/screenshots/ViewContactDetails.jpg" width="320px">
</p>

<hr>

**Contact Edit Page:**

<p align="center">
<img src="./others/screenshots/EditContact.jpg" width="320px">
</p>

<hr>

**Page Not Found:**

<p align="center">
<img src="./others/screenshots/PageNotFound.jpg" width="320px">
</p>

<hr>

## API Routes

All `/contacts` routes require a valid session (the `token` cookie set by login/signup) and only ever operate on the logged-in user's own contacts.

### Contacts

| Method | Route               | Description                                          |
|--------|---------------------|-------------------------------------------------------|
| GET    | `/contacts`         | Fetch contacts (paginated). Accepts `?search=`, `?page=`, `?limit=` |
| GET    | `/contacts/:id`     | Fetch a single contact                                |
| POST   | `/contacts/new`     | Create a contact                                      |
| PATCH  | `/contacts/:id`     | Update a contact                                      |
| DELETE | `/contacts/:id`     | Delete a contact                                      |
| GET    | `/contacts/export`  | Export contacts as a downloadable JSON file. Accepts `?mode=backup\|share` |
| POST   | `/contacts/import`  | Import contacts from a `.json` file (multipart, field name `file`) |

### Users

| Method | Route                    | Auth required | Description                                   |
|--------|--------------------------|:--------------:|------------------------------------------------|
| POST   | `/users/signup`          | No             | Create an account and log in                   |
| POST   | `/users/login`           | No             | Log in, sets the `token` session cookie         |
| POST   | `/users/logout`          | Yes            | Clears the session cookie                       |
| GET    | `/users/restoreSession`  | Yes            | Returns the current user if the session cookie is valid |
| PATCH  | `/users/me`              | Yes            | Update username/email, or change password (`currentPassword` + `newPassword`) |
| DELETE | `/users/me`              | Yes            | Permanently delete the account and all of its contacts |

> Avatar upload (`POST /contacts/:id/avatar`) is referenced by the frontend but not yet implemented on the backend — see the note under Features.

## Testing

The backend has an integration test suite (Vitest + Supertest) covering contact creation, validation, search, and deletion. Tests run against a real MongoDB — either a temporary local instance or an online one — never against your dev database.

```bash
cd Backend
npm test            # if TEST_MONGO_URI is set in .env, it will use online DB otherwise fallback to local DB.
```

To use an online test database (e.g. a free MongoDB Atlas cluster), add this to `Backend/.env`:

```
TEST_MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/contacts_test
```
