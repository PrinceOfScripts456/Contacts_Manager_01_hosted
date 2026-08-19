# Contacts Manager

A full-stack contacts manager with a Node/Express/MongoDB backend and a React (Vite) frontend. Create, search, edit, and organize contacts with multiple phone numbers/emails/dates per contact, switch between grid/list/compact views, import or export your contact list as JSON, and manage your account — all behind JWT-based authentication.

## Features

- **Authentication** — signup, login, logout, and session restore using JWT stored in an httpOnly cookie
- **Contacts CRUD** — create, view, edit, and delete contacts with multiple phones, emails, and important dates per contact, plus company, job title, website, address, notes, and avatar
- **Search & pagination** — search by name, phone, or email with server-side batching/pagination for large contact lists
- **Multiple views** — grid (card), list, and compact layouts
- **Import / export** — bulk import contacts from a JSON file, export all contacts to a downloadable JSON file (with a "share" mode that strips internal IDs)
- **Dark mode**
- **Rate limiting** — login and signup are rate-limited against brute-force attempts (ip-based), contact routes are also rate-limited per user (user-based)
- **Account management** — update profile or delete account

## Tech Stack

**Backend**
- Node.js + Express 5
- MongoDB + Mongoose
- JWT (`jsonwebtoken`) + `bcrypt` for auth
- `zod` for request validation
- `multer` for file uploads (contact import)
- `express-rate-limit`, `cors`, `cookie-parser`, `compression`
- EJS (`ejs-mate`) for a couple of server-rendered utility pages (import helper page, 404 page)
- Vitest + Supertest + `mongodb-memory-server` for testing

**Frontend**
- React 19 + React Router 7
- Vite
- Axios

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- A MongoDB database (local instance or a hosted cluster, e.g. MongoDB Atlas)

### 1. Clone the repository

```bash
git clone <repo-url>
cd Contacts_Manager
```

### 2. Backend setup

```bash
cd Backend
npm install
```

Create a `.env` file in `Backend/`:

```env
MONGO_URI=mongodb://localhost:27017
JWT_SECRET=your_jwt_secret_here
FRONTEND_URLS=http://localhost:5173
PORT=5000
```

- `MONGO_URI` — MongoDB connection string (the app connects to the `contacts_manager` database)
- `JWT_SECRET` — secret used to sign/verify JWTs
- `FRONTEND_URLS` — comma-separated list of allowed CORS origins (must match where the frontend runs)
- `PORT` — optional, defaults to `5000`
- `TEST_MONGO_URI` — optional, used only when running tests (see [Testing](#testing)) to point at a real MongoDB instance instead of the default in-memory one

Run the backend:

```bash
npm run dev     # nodemon, auto-restarts on changes
# or
npm start       # plain node
```

The server starts at `http://localhost:5000`.

### 3. Frontend setup

```bash
cd Frontend
npm install
```

Create a `.env` file in `Frontend/` (optional — defaults to `http://localhost:5000`):

```env
VITE_API_URL=http://localhost:5000
```

Run the frontend:

```bash
npm run dev
```

The app starts at `http://localhost:5173`.

### 4. Open the app

Visit `http://localhost:5173`, sign up for an account, and start adding contacts.

## Testing

Backend tests use Vitest and Supertest. By default they spin up an in-memory MongoDB instance via `mongodb-memory-server`, so no live database is required:

```bash
cd Backend
npm test
```

To run tests against a real MongoDB instance instead (e.g. a hosted/Atlas database), set `TEST_MONGO_URI` in `Backend/.env` (or in your shell/CI environment) — when present, it's used as the connection string in place of the in-memory server:

```env
TEST_MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net
```

## API Overview

**Auth** — `/users`
| Method | Endpoint                | Auth required | Description                      |
|--------|-------------------------|:-------------:|----------------------------------|
| POST   | `/users/signup`         | No            | Create an account (also logs in) |
| POST   | `/users/login`          | No            | Log in                           |
| POST   | `/users/logout`         | Yes           | Log out                          |
| GET    | `/users/restoreSession` | Yes           | Restore session from cookie      |
| PATCH  | `/users/me`             | Yes           | Update profile                   |
| DELETE | `/users/me`             | Yes           | Delete account                   |

**Contacts** — `/contacts` 

All `/contacts` routes require a valid session (the `token` cookie set by login/signup) and only ever operate on the logged-in user's own contacts.

| Method | Endpoint           | Description                                                                |
|--------|--------------------|----------------------------------------------------------------------------|
| GET    | `/contacts`        | Fetch contacts (paginated). Accepts `?search=`, `?page=`, `?limit=`        |
| GET    | `/contacts/:id`    | Fetch a single contact                                                     |
| POST   | `/contacts/new`    | Create a contact                                                           |
| PATCH  | `/contacts/:id`    | Update a contact                                                           |
| DELETE | `/contacts/:id`    | Delete a contact                                                           |
| GET    | `/contacts/export` | Export contacts as a downloadable JSON file. Accepts `?mode=backup\|share` |
| POST   | `/contacts/import` | Bulk import contacts from a JSON file                                      |

> Avatar upload (`POST /contacts/:id/avatar`) is referenced by the frontend but not yet implemented on the backend - which results in harmless 404 error.

## Deployment

The backend includes a `vercel.json` configured to deploy `server.js` as a serverless function on Vercel. Set the `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URLS` environment variables in your Vercel project settings. The frontend (a static Vite build) can be deployed separately (e.g. Vercel, Netlify) with `VITE_API_URL` pointed at the deployed backend.

## Screenshots

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
