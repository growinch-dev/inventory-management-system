# Deployment Guide

This app is **multi-tenant**: one running instance serves many customers, each
isolated as a "tenant" (organization). The **same codebase** runs two ways:

- **Online (SaaS):** you host one instance; all customers log in at your URL.
- **Local / on-premise:** installed on the customer's own PC/server, works
  offline, reachable over their office network.

> **Customers never need their own domain.** Online, *you* own one domain and
> everyone logs in there. Local, nobody needs a domain — users open the app by
> the host PC's address on the network.

Both modes use one Express server that serves the built React app **and** the
API from a single origin, so the frontend talks to a relative `/api` and works
on `localhost`, a LAN IP, or any domain with no rebuild.

---

## Mode A — Online (one deployment for all customers)

1. **Server:** any VPS or platform (DigitalOcean/Hostinger/Render/Railway).
2. **Database:** MongoDB Atlas.
3. **Config:** `backend/.env` (copy from `backend/.env.example`):
   ```
   NODE_ENV=production
   SERVE_CLIENT=true
   PORT=5001
   MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/growinch-inventory?retryWrites=true&w=majority
   JWT_SECRET=<long random string>
   FRONTEND_URL=https://your-domain.com
   ```
4. **Build the client, then start the server:**
   ```bash
   cd frontend && npm ci && npm run build
   cd ../backend && npm ci && npm start
   ```
   The server now serves the UI and API on port 5001. Put Nginx/Caddy in front
   for HTTPS on your domain (recommended), or run behind the platform's HTTPS.
5. **Customers:** each signs up at `https://your-domain.com/register`, which
   creates their organization. One shared login page; data is tenant-isolated.

> A domain (~₹700–1000/yr) is strongly recommended so you get HTTPS. You *can*
> run on a bare server IP, but browsers will show it as "not secure".

---

## Mode B — Local / on-premise (offline, no internet, no domain)

Everything runs on the customer's machine with a **local MongoDB**. The easiest,
most reliable way to ship this to a non-technical customer is **Docker**.

### Recommended: Docker (one command)

On the customer's PC (one-time: install **Docker Desktop**):

```bash
# in the project folder
cp .env.example .env          # then put a long random JWT_SECRET in it
docker compose up -d --build
```

Open **http://localhost:5001** on that PC. From other office computers, use the
host PC's LAN address, e.g. **http://192.168.1.50:5001** (find it with `ipconfig`).

- App + MongoDB both run in containers; data persists in the `mongo_data` volume.
- No internet, no Atlas, no domain.
- Update later: `git pull` (or copy new files) then `docker compose up -d --build`.

### Why Docker over a hand-rolled installer

You asked which to use. Recommendation: **Docker**, because the app bundles its
own MongoDB and runs identically on every customer PC — far fewer "works on my
machine" support calls. The only cost is installing Docker Desktop once (it runs
on Windows 10/11 Home via WSL2).

Choose a **manual install** (install Node + MongoDB on the PC, run `npm start`)
only for a customer who can't/won't install Docker. It's more moving parts and
more fragile; steps:
```bash
# install Node 20 and MongoDB Community Server on the PC
cd frontend && npm ci && npm run build
cd ../backend && npm ci
#   set backend/.env: MONGODB_URI=mongodb://127.0.0.1:27017/growinch-inventory, SERVE_CLIENT=true, PORT=5001, JWT_SECRET=...
npm start
```

### Access from other PCs in the office

The app listens on all interfaces, so any device on the same network can reach
`http://<host-PC-LAN-IP>:5001`. Allow port 5001 through the host's Windows
Firewall if prompted.

---

## First login (both modes)

There is no customer data in a fresh database. The **first user registers their
organization** at `/register` — that creates the tenant and its admin account.
After that, the admin invites staff from the Users page.

(Optional global admin for testing: `cd backend && npm run seed:admin`.)

---

## Development workflow

Two terminals; the Vite dev server proxies `/api` to the backend (so there's no
CORS issue and the frontend uses the same relative `/api` as production):

```bash
cd backend  && npm run dev     # http://localhost:5001  (API)
cd frontend && npm run dev     # http://localhost:5175  (UI, proxies /api → 5001)
```

If your backend runs on a different port, set `VITE_PROXY_TARGET` in
`frontend/.env`.
