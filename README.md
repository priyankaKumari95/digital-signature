# DigiSign — Digital Signature & Document Management Platform

DigiSign lets users upload PDF documents, sign them electronically, manage them,
and lets anyone verify a signed document's authenticity through a public
verification mechanism backed by cryptographic hashing.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features Implemented](#features-implemented)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Database Design](#database-design)
6. [API Overview](#api-overview)
7. [Setup Instructions](#setup-instructions)
8. [Environment Variables](#environment-variables)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Demo Credentials](#demo-credentials)
12. [Assumptions Made](#assumptions-made)
13. [Known Limitations](#known-limitations)
14. [Future Improvements](#future-improvements)

---

## Project Overview

Organizations need a simple, trustworthy way to sign and manage documents.
DigiSign provides an end-to-end workflow:

**Upload → Preview → Place signature → Finalize (sign) → Download → Verify**

When a document is signed, the platform:

1. Stamps the chosen signature image(s) onto the PDF at the exact positions the
   user placed them.
2. Embeds a **verification banner + QR code** linking to a public verification
   page.
3. Computes a **SHA-256 fingerprint** of the final signed PDF and stores it with
   a unique **verification ID**.

A third party can then visit `/verify/:verificationId` (or scan the QR) to
confirm the document was signed through the platform and that it has not been
tampered with (the stored file is re-hashed and compared to the recorded
fingerprint). Every meaningful action is recorded in an append-only **audit
trail**, and an **admin panel** provides operational visibility.

---

## Features Implemented

### Public
- Landing page
- User registration & login (JWT)
- Password recovery flow (forgot + reset password)
- Public document verification page (by ID or QR), incl. signed-file download

### Document workflow (authenticated)
- Upload PDF documents (type + size validated, real PDF parsing)
- In-browser PDF preview (rendered with pdf.js)
- Draw or type a signature and place/drag/resize it on any page
- Finalize signing — visual signature embedded **and** SHA-256 fingerprint generated
- Download signed documents
- Revisit and manage previously uploaded documents

### Dashboard
- View all documents with status (`uploaded` / `in_progress` / `signed`)
- Search by title, filter by status, paginate
- Continue incomplete workflows; download/verify completed ones

### Reusable signatures
- Save drawn/typed signatures and reuse them across documents
- Mark a default signature

### Verification system
- Cryptographic SHA-256 fingerprint + unique verification ID per signed document
- Tamper detection: stored file re-hashed and compared on every verification
- QR code embedded into the signed PDF pointing at the public verify page

### Auditability
- Append-only audit log of registrations, logins (incl. failures), uploads,
  views, downloads, signings, signature creation/deletion, verifications and
  admin actions — with actor, IP, user-agent and contextual metadata

### Administration
- Platform stats (users, documents, signed count, audit events)
- User management (promote/demote role, enable/disable account)
- Cross-user document listing
- Searchable, paginated audit-log viewer

---

## Technology Stack

| Layer       | Technology |
|-------------|-----------|
| Frontend    | React 19, Vite, React Router 7, Tailwind CSS v4, axios, pdf.js, signature_pad, lucide-react |
| Backend     | Node.js, Express, Mongoose |
| Database    | MongoDB |
| Auth        | JWT (bearer), bcrypt password hashing |
| PDF / crypto| pdf-lib (stamping), qrcode (QR), Node `crypto` (SHA-256) |
| Validation  | Zod |
| Security    | helmet, cors, express-rate-limit, express-mongo-sanitize, hpp |
| Testing     | Jest + Supertest + mongodb-memory-server (backend), Vitest (frontend) |
| DevOps      | Docker, docker-compose, nginx (SPA serve + reverse proxy) |

---

## Architecture Overview

```
digital-signature/
├── client/                 # React + Vite SPA
│   └── src/
│       ├── api/            # axios client + typed resource modules
│       ├── components/     # Layout, route guards, PDF canvas, signature pad, UI kit
│       ├── context/        # AuthContext, ToastContext
│       ├── pages/          # Landing, auth, dashboard, editor, signatures, admin, verify
│       └── lib/            # formatting helpers
│
├── server/                 # Express REST API (layered architecture)
│   └── src/
│       ├── config/         # env validation, DB connection
│       ├── models/         # Mongoose schemas (User, Document, Signature, AuditLog)
│       ├── routes/         # HTTP routing
│       ├── controllers/    # request/response handling (thin)
│       ├── services/       # business logic (auth, document, signing, pdf, verification, audit, admin)
│       ├── middleware/     # auth, validation, error handling, rate limiting, uploads
│       └── utils/          # crypto, token, storage, mailer, logger, constants
│
├── docker-compose.yml      # mongo + server + client
└── README.md
```

**Backend design principles**

- **Layered separation of concerns:** `routes → controllers → services → models`.
  Controllers are thin; all business logic lives in services and is independently
  unit-testable.
- **Centralized error handling:** a single error middleware normalizes Zod,
  Mongoose, Multer and JWT errors into a consistent `{ success, message, details }`
  JSON shape and masks internals in production.
- **Validation at the edge:** every mutating/parameterized route validates and
  coerces input with Zod before it reaches a controller.
- **Storage abstraction:** all file I/O goes through `utils/storage.js`, so moving
  from local disk to S3/GCS only touches one module.
- **Auditing is best-effort:** audit writes never break the action they record.

**Frontend design principles**

- Single axios instance with token injection + centralized 401 handling.
- Context-based auth/session and toast notifications.
- Route guards (`ProtectedRoute`, `AdminRoute`) with loading states.
- Signature placements stored as **page-relative ratios (0..1)** so positions map
  exactly onto the server's PDF coordinate system regardless of preview zoom/DPI.

---

## Database Design

MongoDB with Mongoose. Four collections:

### `users`
| Field | Type | Notes |
|------|------|------|
| name | String | required |
| email | String | required, **unique**, lowercased |
| password | String | bcrypt hash, `select:false` (never returned) |
| role | String | `user` \| `admin` |
| isActive | Boolean | account enable/disable |
| lastLoginAt | Date | |
| resetPasswordTokenHash | String | SHA-256 of reset token, `select:false` |
| resetPasswordExpires | Date | `select:false` |

### `documents`
| Field | Type | Notes |
|------|------|------|
| owner | ObjectId → User | **indexed** |
| title | String | |
| originalFilename | String | |
| status | String | `uploaded` \| `in_progress` \| `signed` (**indexed**) |
| pageCount | Number | |
| originalFile | { storageKey, size, mimeType } | source PDF |
| signedFile | { storageKey, size, mimeType } | present after signing |
| appliedSignatures | [{ page, x, y, width, height, signatureId }] | placement metadata (ratios) |
| verificationId | String | **unique, sparse, indexed** — public id |
| sha256 | String | fingerprint of signed PDF (tamper anchor) |
| signerName | String | |
| signedAt | Date | |

Compound index `{ owner: 1, createdAt: -1 }` for the dashboard listing.

### `signatures` (reusable assets)
| Field | Type | Notes |
|------|------|------|
| owner | ObjectId → User | **indexed** |
| name | String | |
| type | String | `drawn` \| `typed` |
| dataUrl | String | PNG data URL |
| isDefault | Boolean | one default per user (enforced on create) |

### `auditlogs` (append-only)
| Field | Type | Notes |
|------|------|------|
| action | String (enum) | **indexed** |
| actor | ObjectId → User | nullable (anonymous verifications) |
| actorEmail | String | denormalized snapshot |
| targetType / targetId | String / ObjectId | what was acted on |
| ip, userAgent | String | request context |
| metadata | Mixed | action-specific detail |
| createdAt | Date | **indexed** (`updatedAt` disabled — logs are immutable) |

**Why this design**

- A **relational-style** model (references between users/documents/signatures/logs)
  fits the strong ownership and traceability requirements better than embedding,
  while MongoDB keeps flexible sub-documents (file metadata, placements, audit
  metadata) ergonomic.
- The **verification ID and SHA-256 live on the document** — verification is a
  single indexed lookup, and authenticity is provable by re-hashing the stored
  file.
- Audit logs are a **separate append-only collection** with time + action indexes
  so the admin viewer stays fast and logs survive user deletion (denormalized
  email).

---

## API Overview

Base path: `/api`. All responses use `{ success, data?, message?, details? }`.
Authenticated routes expect `Authorization: Bearer <token>`.

### Auth — `/api/auth`
| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/register` | – | `{ name, email, password }` |
| POST | `/login` | – | `{ email, password }` |
| POST | `/forgot-password` | – | `{ email }` |
| POST | `/reset-password` | – | `{ token, password }` |
| GET  | `/me` | ✓ | – |

### Documents — `/api/documents` (auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Upload PDF (multipart `file`, optional `title`) |
| GET | `/` | List own documents (`?page,limit,status,q`) |
| GET | `/:id` | Get one document |
| GET | `/:id/file?variant=original\|signed` | Inline view (preview) |
| GET | `/:id/download?variant=signed\|original` | Download (attachment) |
| POST | `/:id/sign` | Finalize: `{ placements:[{page,x,y,width,height,imageDataUrl}], signerName? }` |
| DELETE | `/:id` | Delete document + files |

### Signatures — `/api/signatures` (auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create `{ name, type, dataUrl, isDefault? }` |
| GET | `/` | List own signatures |
| DELETE | `/:id` | Delete |

### Verification — `/api/verify` (public)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/:verificationId` | Verify authenticity + integrity |
| GET | `/:verificationId/download` | Download the signed PDF |

### Admin — `/api/admin` (admin only)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Platform metrics + recent activity |
| GET | `/users` | List users (`?page,limit,q`) |
| PATCH | `/users/:id` | Update `{ role?, isActive? }` |
| GET | `/documents` | List all documents |
| GET | `/audit-logs` | List audit logs (`?page,limit,action,actor,targetId`) |

Health check: `GET /api/health`.

---

## Setup Instructions

### Option A — Docker (recommended, one command)

Requires Docker + Docker Compose.

```bash
cp .env.example .env        # then edit secrets
docker compose up --build
# Frontend  → http://localhost:8080
# API       → http://localhost:5000/api/health
# Seed demo accounts:
docker compose exec server npm run seed
```

### Option B — Local development

Requires Node.js 18+. You need a MongoDB instance — use **any** of:
MongoDB Atlas (set `MONGO_URI`), `docker run -p 27017:27017 mongo:7`, a local
install, or the bundled **zero-install** launcher below.

**1. Database** (zero-install option — reuses the `mongod` the tests download;
data persists in `server/.cache/mongo-data`). Keep this terminal open:
```bash
cd server
npm install
npm run db                  # starts MongoDB on mongodb://127.0.0.1:27017
```

**2. Backend** (second terminal):
```bash
cd server
cp .env.example .env        # optional: set MONGO_URI, JWT secrets
npm run seed                # create demo admin + user (optional)
npm run dev                 # http://localhost:5000
```

**3. Frontend** (third terminal):
```bash
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api → :5000)
```

> If you have your own MongoDB (Atlas/Docker/installed), skip `npm run db` and set
> `MONGO_URI` in `server/.env` instead.

---

## Environment Variables

See [`server/.env.example`](server/.env.example) (local) and
[`.env.example`](.env.example) (docker-compose). Key variables:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` / `JWT_RESET_SECRET` | Token signing secrets (**required in prod**) |
| `JWT_EXPIRES_IN` | Access token lifetime (default `7d`) |
| `CLIENT_URL` | Public SPA URL (used in email links + verification QR codes) |
| `SERVER_URL` | Public API URL |
| `MAX_FILE_SIZE_MB` | Upload size limit (default 15) |
| `SMTP_*` / `MAIL_FROM` | Email transport for password reset (optional — falls back to console logging) |
| `SEED_*` | Demo account credentials |

> When SMTP is not configured, password-reset links are logged to the server
> console and (in non-production) returned by the API so the flow is fully
> testable without a mail server.

---

## Testing

**Backend** — 57 tests across auth, documents, signing, verification, signatures,
admin and unit-level crypto/PDF helpers (including concurrency, regex-injection and
off-page-placement regression tests). Runs entirely in-memory
(mongodb-memory-server) with no external services.

```bash
cd server && npm test
```

**Frontend**
```bash
cd client && npm test
```

**Live end-to-end smoke test** — boots the real server over HTTP against an
in-memory MongoDB and walks the full happy path (register → upload → sign →
public verify → download signed PDF):

```bash
cd server && npm run smoke
```

> **Windows note:** MongoDB requires the Microsoft Visual C++ runtime. The test
> harness (`server/tests/prepare-mongo.js`) automatically downloads the `mongod`
> binary and, if the runtime DLLs are missing system-wide, copies them next to
> the binary — so `npm test` works without a manual VC++ Redistributable install.

---

## Deployment

The app is fully containerized and deploys as three services
(`mongo`, `server`, `client`). Recommended targets:

- **Containers (server + client):** Render, Railway, Fly.io, or any Docker host
  via `docker compose up`.
- **Database:** MongoDB Atlas (set `MONGO_URI`) or a managed MongoDB container.
- **Static frontend (alt):** build `client` (`npm run build`) and host `dist/` on
  Vercel/Netlify with `VITE_API_URL` pointed at the deployed API.

Production checklist:
1. Set strong `JWT_SECRET` / `JWT_RESET_SECRET`.
2. Set `CLIENT_URL` / `SERVER_URL` to the public URLs.
3. Point `MONGO_URI` at managed MongoDB.
4. Mount a persistent volume for `server/uploads` (or switch storage to S3).
5. Configure SMTP for real password-reset emails.

> Live URLs: _to be filled in after deploying to your chosen host._

---

## Demo Credentials

Created by `npm run seed` (override via `SEED_*` env vars):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@digisign.local` | `Admin@12345` |
| User  | `demo@digisign.local`  | `Demo@12345` |

---

## Assumptions Made

- **Signature semantics:** "electronic signature" = a visual signature stamped
  into the PDF **plus** a cryptographic SHA-256 fingerprint for tamper-evidence
  and a public verification record. This is an application-level integrity
  guarantee, not a PKI/X.509 digital certificate (see Future Improvements).
- A document is signed in a single finalize step; re-signing an already-signed
  document is disallowed to preserve the integrity of its fingerprint.
- Files are stored on local disk behind a storage abstraction (volume-mounted in
  Docker); this is appropriate for an MVP and swappable for object storage.
- Public verification intentionally exposes only non-sensitive metadata (title,
  signer name, signed date, fingerprint) — never the owner's email.
- A single short-lived JWT (bearer) is used for auth; suitable for an MVP.

## Known Limitations

- JWT is stored in `localStorage` (simple, but susceptible to XSS) rather than an
  httpOnly cookie with refresh-token rotation.
- No PKI/certificate-based signatures (PAdES/X.509) — integrity is via SHA-256 +
  server-side verification record.
- Local-disk file storage is not horizontally scalable without a shared volume or
  object storage.
- Email delivery requires SMTP config; otherwise links are console-logged.
- Frontend ships pdf.js in the main bundle (large JS chunk); not yet code-split.
- No virus/malware scanning of uploads.

## Future Improvements

- httpOnly cookie auth + refresh-token rotation; optional 2FA.
- True digital signatures (PAdES / X.509 certificates, timestamping authority).
- Object storage (S3/GCS) with signed URLs; background processing queue.
- Multi-party / sequential signing workflows and email signing invitations.
- Code-split the PDF viewer; add E2E tests (Playwright) and CI pipeline.
- Audit-log export (CSV) and richer admin analytics.
