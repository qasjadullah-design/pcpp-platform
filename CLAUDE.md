# CLAUDE.md — PCPP Platform

Project context and hard-won gotchas for working on the Pakistan Consolidated Project Pipeline (PCPP) platform. Read this fully before editing.

---

## What this is

A government-facing dashboard for the Ministry of Climate Change (MoCC) that connects public-sector project developers (line ministries, provincial governments) with investors and development partners. Role-based dashboards + a structured project approval workflow.

**Stack:** React 18 (CRA, Tailwind) frontend · Node.js/Express backend (raw `pg`, see warning below) · PostgreSQL · deployed on Render.com (separate frontend + backend services) · repo `qasjadullah-design/pcpp-platform`, branch `main`.

**Deployment:** Render auto-deploys on every push to `main`. Backend redeploys fast; the frontend (React build) is slower. No manual deploy step needed — `git push origin main` is the deploy.

---

## ⚠️ CRITICAL GOTCHAS — these caused every bug so far

### 1. The live backend is `backend/routes/*.js`, NOT `backend/src/`
`server.js` loads `./routes/*` (raw `pg` / `pool.query`). There is a parallel **`backend/src/`** tree (Sequelize controllers, models, routes) that is **dead code** — it is not wired into the running server. It looks authoritative but isn't. **Always edit `backend/routes/*.js`.** When in doubt, trace from `server.js`'s `app.use(...)` lines. The duplicate `src/` tree should eventually be deleted to remove the trap.

### 2. Real DB column names differ from what old code assumed
The codebase was written against an older schema. The live database uses these names — use them everywhere:

| Wrong (legacy code) | Correct (real DB) |
|---|---|
| `owner_id` | `user_id` |
| `total_project_cost` | `total_cost` |
| `expected_completion` | `end_date` |
| `min_investment` | `minimum_investment` |

A 500 with Postgres code `42703` ("column ... does not exist") is almost always one of these. Note: `interests` table uses `user_id` too, but some `interests.js` code still says `investor_id` — a known latent bug in the interest flow.

### 3. The axios interceptor unwraps `response.data`
In `frontend/src/services/api.js`, the response interceptor returns `response.data`. So in every component, the API call result **is the response body already**. Read `r.projects`, `r.total`, `r.status_stats` — **never `r.data.xxx`**. Using `r.data` returns `undefined`, the `.catch(()=>{})` swallows it, and you get a silent empty state (no error). This has caused multiple "page shows nothing" bugs.

Many admin endpoints wrap their payload as `{ success: true, data: {...} }`. With the interceptor, that means the real data is at `r.data` for *those* endpoints. Check the specific route's `res.json(...)` shape before wiring the frontend — don't assume.

### 4. Empty form fields arrive as `""`, which breaks numeric/date columns
React forms send blank fields as empty strings. Postgres rejects `""` for integer/numeric/date columns (error `22P02`). The project-create handler in `routes/projects.js` uses a helper `const n = (v) => (v === '' || v === undefined ? null : v);` and wraps every numeric/date value in the INSERT params with `n(...)`. Apply the same pattern to any new numeric/date fields.

---

## Project workflow (by design)

`create` (provincial/owner submits) → status **`under_review`** → admin reviews in Pending Review pane → **approve** sets status **`approved`** → project appears in the public projects list. The create handler hardcodes `status = 'under_review'`. Admin review endpoint: `PUT /api/admin/projects/:id/review` with `{ action: 'approve'|'reject'|'request_changes' }`.

Status values in the DB enum: `draft, under_review, approved, rejected, changes_requested, under_implementation, completed, archived`.

---

## Current state (as of handoff)

- **Phase 0 is complete:** project submission, review queue, approve flow, admin projects list, and dashboard funding total all work end-to-end.
- **~2647 real ADP/PSDP projects are loaded** (the dummy 50 are gone). Import scripts live in `backend/seeds/`.
- Most projects are NOT `approved` (only ~51 are) — the bulk sit in another status. Confirm the real spread via the By Status data before building lifecycle features.
- The admin dashboard cards (By Sector / By Status / TRL / By District / Top Investors) are fed by `GET /api/admin/dashboard` in `routes/admin.js`. That route returns a **flat** payload (no `{success,data}` wrapper): `total_projects, pending_review, total_users, total_funding, recent_projects, recent_activity, sector_stats, status_stats, trl_stats, district_stats, top_investors, top_sectors`. `AdminDashboard.jsx` reads these directly off the response (`r.status_stats`, etc. — **not** `r.data.*`). These aggregates count **all statuses** (drafts included) so the cards populate regardless of import status.
  - ⚠️ There is also a separate `routes/analytics.js` mounted at `/api/analytics` (route `/`) that is **broken and unused** by the dashboard: it uses legacy columns (`total_project_cost`, `owner_id`, `interests.investor_id`) that 500 with `42703`, and its keys differ (`by_status`, `trl_distribution`). The frontend's `adminAPI.getAnalytics()` points at the nonexistent `/api/admin/analytics` (404). Don't wire the dashboard to it — fix or delete it separately.

### Known minor issues still open
- `interests.js` uses `investor_id` instead of `user_id` (latent — breaks investor interest flow).
- `trust proxy` warning on Render: add `app.set('trust proxy', 1);` after `const app = express();` in `server.js` for accurate rate-limiting.
- `src/` dead Sequelize tree should be removed.

---

## Commands

> ⚠️ A previous version of this file said to "work in `backend/src/` and use `App.jsx`" and described a Sequelize/MVC backend. That was **wrong** — it documented the intended design, not what runs. This file is corrected against actual runtime behavior (confirmed via Render logs and the live DB). If anything here ever conflicts with a hunch that `src/` is canonical, trust this file: the live path is `backend/routes/` (raw `pg`).

**Backend (`backend/`):**
```bash
npm run dev       # nodemon, port 5000
npm start         # production
npm test          # jest
```
**Frontend (`frontend/`):**
```bash
npm start         # dev, port 3000
npm run build     # production build
```
**Docker (full stack):** `docker-compose up --build`

Note: `npm run migrate` / `npm run seed` and `sequelize.sync` belong to the dead `src/` path — the live server does not auto-migrate. Schema changes are **manual SQL** against the Render Postgres (via pgAdmin using the External Database URL) or a SQL file in `backend/seeds/` or `backend/migrations/`.

## Environment variables

Backend `.env`: `DATABASE_URL` (Render Postgres), `JWT_SECRET`, `JWT_EXPIRE`, `FRONTEND_URL` (CORS origin), `SMTP_*` (Nodemailer, configured not active), `PORT` (5000).
Frontend `.env`: `REACT_APP_API_URL` (points at the Render backend URL in prod, `http://localhost:5000/api` locally).

Copy `.env.example` → `.env` in both folders. Keep real secrets out of commits.

## Key files

**Backend (live):**
- `backend/server.js` — entry; mounts `./routes/*`
- `backend/routes/projects.js` — project CRUD (create handler ~line 147)
- `backend/routes/admin.js` — dashboard (feeds all dashboard cards), pending, review, projects list, export, users
- `backend/routes/analytics.js` — broken/unused alternate analytics route at `/api/analytics` (legacy column names, 500s; not used by the dashboard)
- `backend/routes/users.js`, `interests.js`, `auth.js`, `notifications.js`
- `backend/seeds/` — ADP/PSDP import scripts

**Frontend:**
- `frontend/src/services/api.js` — axios client + the unwrapping interceptor
- `frontend/src/pages/admin/AdminDashboard.jsx` — metric + analytics cards + lifecycle doughnut; calls `adminAPI.getDashboard()` (`/api/admin/dashboard`) and reads the flat payload directly (`r.status_stats`, `r.trl_stats`, … — **not** `r.data.*`)
- `frontend/src/pages/admin/AdminProjectsPage.jsx` — All Projects (reads `r.projects`/`r.total`/`r.status_counts`)
- `frontend/src/pages/admin/AdminReviewPage.jsx` — Pending Review (reads `r.projects`)
- `frontend/src/pages/dashboard/SubmitProjectPage.jsx` — the 14-section submit form
- `frontend/src/pages/public/ProjectsPage.jsx`, `ProjectDetailPage.jsx`
- `frontend/src/utils/constants.js` — sector lists, status colors, dropdown options
- `frontend/package.json` — charting available via **chart.js 4 + react-chartjs-2** (no recharts; don't add it)

---

## How to make changes (conventions)

1. Edit the **live** file (`routes/`, not `src/`).
2. For any new DB column: migration → model (if Sequelize ever revived; currently raw SQL) → submit form → detail view → **import mapping in `backend/seeds/`** (the 2647 import must populate new columns). This is the "5-file touch."
3. Verify locally if possible, then `git push origin main` to deploy.
4. After a frontend data change, confirm the key matches the endpoint's actual `res.json` shape (see gotcha #3).
5. Keep secrets out of committed files. Admin login exists for the production DB (`admin@pcpp.gov.pk`); keep the password in your local notes / env, not in the repo.

---

## Improvement plan (feature roadmap)

See `PCPP_Dashboard_Improvements_Action_Plan.md` for the full phased plan. Execution order:

```
Phase 0  (DONE) submission + review + dashboard data plumbing
A1  TRL hover tooltips (frontend only)
A2  Lifecycle breakdown chart: Ongoing/Pipeline/Completed
      (under_implementation=Ongoing, completed=Completed, rest=Pipeline)
A3  Carbon-market readiness fields (conditional)
A4  Feasibility sub-section
B1  province column + cascading province→district dropdowns  ← must be in 2647 import
B2  Province-wise bar chart (needs B1 + A2)
B3  WEF nexus restructure + form section reorder
B4  Line ministry + provincial contacts + partners
C1  Mitigation/CO2 fields + SI unit toggle (+ normalized tCO2e column)
C2  Climate & Environmental Impact section (dedup with A3/C1)
C3  NDC 3.0 tracker (needs C1 + hardcoded national target)
D1  Financial breakdown + funding agency + ADP toggle
D2  Top Investors breakdown (needs structured investor data — confirm first)
```

**Decisions still needed from the team lead:** NDC 3.0 national MtCO₂e target to hardcode (C3); whether investor records will carry province/public-private/donor-agency data (D2); authoritative province→district list (B1); 2647 import column map must include `province` and `line_ministry`.
