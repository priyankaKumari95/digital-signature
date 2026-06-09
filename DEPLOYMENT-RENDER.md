# Deploying DigiSign to Render

Render hosts the **API** (Node web service) and the **frontend** (static site).
MongoDB is hosted free on **MongoDB Atlas** (Render has no managed MongoDB).

Total cost: **$0** (Render free web service + free static site + Atlas M0).

> Note: Render's free web service sleeps after ~15 min of inactivity, so the
> first request after idle takes ~30–60s to wake up. That's normal on the free tier.

---

## 1. Push the code to GitHub

The repository is already initialized and committed locally. Create an empty
GitHub repo named `digital-signature`, then:

```bash
git remote add origin https://github.com/<your-username>/digital-signature.git
git branch -M main
git push -u origin main
```

## 2. Create a free MongoDB Atlas database

1. Sign up at https://www.mongodb.com/cloud/atlas and create a **free M0 cluster**.
2. **Database Access** → add a database user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — required so Render can connect).
4. **Connect → Drivers** → copy the connection string, e.g.:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/digital_signature?retryWrites=true&w=majority
   ```
   (Add `/digital_signature` before the `?` so it uses that database.)

## 3. Deploy on Render via the Blueprint

1. In the Render dashboard: **New → Blueprint**.
2. Connect your GitHub account and pick the `digital-signature` repo.
3. Render reads [`render.yaml`](render.yaml) and proposes two services:
   `digisign-api` and `digisign-web`. Click **Apply**.
4. `JWT_SECRET` and `JWT_RESET_SECRET` are generated automatically.

## 4. Set the environment variables

The first deploy will start, but you must fill in the `sync: false` variables.
Service URLs follow the pattern `https://<service-name>.onrender.com`.

**On `digisign-api` → Environment:**
| Key | Value |
|-----|-------|
| `MONGO_URI` | your Atlas connection string from step 2 |
| `CLIENT_URL` | `https://digisign-web.onrender.com` |
| `SERVER_URL` | `https://digisign-api.onrender.com` |

**On `digisign-web` → Environment:**
| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://digisign-api.onrender.com/api` |

> The exact subdomains are shown in each service's dashboard. If Render appended
> a suffix (e.g. `digisign-api-x1y2`), use the actual URLs.

After setting these, trigger **Manual Deploy → Deploy latest commit** on both
services (the frontend must rebuild so `VITE_API_URL` is baked into the bundle).

## 5. Seed the demo accounts

On the `digisign-api` service, open the **Shell** tab and run:

```bash
npm run seed
```

This creates:
- Admin — `admin@digisign.local` / `Admin@12345`
- User  — `demo@digisign.local`  / `Demo@12345`

(You can override these with `SEED_*` env vars before seeding.)

## 6. Verify

- Open `https://digisign-web.onrender.com` → register/login, upload a PDF, sign it.
- `https://digisign-api.onrender.com/api/health` → `{"success":true,"status":"ok"}`.
- Public verification works at `https://digisign-web.onrender.com/verify/<id>`.

---

## Optional: deploy via the Render API/CLI instead of the dashboard

If you prefer automation, create a Render **API key** (Account Settings → API Keys)
and a **GitHub connection**, then the same `render.yaml` can be applied with the
Render CLI (`render blueprint launch`) or the REST API. The dashboard Blueprint
flow above is the simplest and is recommended.

## Troubleshooting

- **API crashes on boot** — `MONGO_URI` is wrong/unset, or Atlas Network Access
  doesn't allow `0.0.0.0/0`. Check the API logs.
- **Frontend loads but API calls fail (CORS)** — `CLIENT_URL` on the API must
  exactly match the frontend URL, and `VITE_API_URL` must point at the API + `/api`.
  Rebuild the frontend after changing `VITE_API_URL`.
- **Login works but verification QR links point to localhost** — set `CLIENT_URL`
  on the API to the deployed frontend URL and redeploy.
