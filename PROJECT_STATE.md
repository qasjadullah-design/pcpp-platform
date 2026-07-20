# PCPP - Project State & Handoff

Portable working doc for moving between AI tools (Claude Code, Codex, chat) without losing context.

Read this first, then inspect the code. This file is the current state; `CLAUDE.md` is the architecture map if present.

---

## 1. Orientation

PCPP is a government project-pipeline dashboard for Pakistan's Ministry of Climate Change. It uses a React CRA frontend, Node/Express backend with raw `pg`, and PostgreSQL on Render. The live backend code is in `backend/routes/`, not `backend/src/`. The active frontend entry is `frontend/src/App.js`. The GitHub repo is linked to Render; pushing to `main` triggers deployment. Recent work has focused on interface polish, role-aware analytics, provincial scoping, admin project management, export, and pagination.

## 2. Non-Negotiable Gotchas

1. Live backend is `backend/routes/*.js`. Treat `backend/src/` as dead or duplicate code unless proven otherwise.
2. Real DB project columns include `user_id`, `total_cost`, `end_date`, and `minimum_investment`. Avoid old aliases like `owner_id`, `total_project_cost`, `expected_completion`, and `min_investment` in live routes unless intentionally supporting legacy input.
3. Interests use `interests.user_id` and `owner_response`.
4. Axios interceptor unwraps `response.data`, so frontend API calls receive the JSON body directly.
5. Empty form fields often arrive as `""`; normalize numeric/date values before DB writes.
6. Do not stage unrelated local dirty files. Known unrelated dirty/untracked files currently exist:
   - `.claude/settings.local.json`
   - `backend/seeds/import_adp_psdp_projects.js`
   - `.Rhistory`
   - `PCPP_Phase1_Rebrand_Analytics_Spec.md`
   - `backend/node`
   - `backend/routes/projects.js.tmp.20420.8590e7844d29`
   - `backend/seeds/data/pcpp_projects_import_master.csv`
   - `backend/seeds/delete_bulk_import_test_rows.js`
   - `backend/seeds/quick_count.js`

## 3. Deploy Mechanics

- Current working branch is `main`.
- Recent changes were committed directly to `main` and pushed.
- Render deployment should pick up pushes to `main`.
- Always stage only intended files explicitly.
- Recent verification pattern:
  - `node --check backend/routes/admin.js`
  - `git diff --check`
  - `npm run build` from `frontend/`
- PowerShell may print a profile execution-policy warning after commands; builds still succeeded when exit code was 0.

---

## 4. Done Log - Recent Commits

- `pending WEF Round 2 design, submission, public projects, and gated alignment`
  - Implemented the WEF-themed design foundation with expanded tokens, sector/chart colors, WEF nexus mark, reusable SDG badges, and a logo-ready placeholder component.
  - Updated Submit Project with clearer 7-step sections, icon section headers, proper required-field legend, Critical moved from Priority to Risk, Sector/Carbon Standard/Currency "Other" inputs, AUD/CFA currencies, ADP/PSDP funding tag, CO2e language, and separated Climate & Impact from Team & Partners.
  - Added migration `backend/migrations/006_move_critical_priority_to_risk.sql`; updated initial schema and migrator awareness. Live DB still needs the migration applied before production can safely persist/use the moved critical-risk behavior.
  - Updated admin filtering so `high_or_critical` means high priority or critical risk, while legacy `priority=critical` maps to critical risk for compatibility.
  - Added a public projects location map, fixed province filtering to use a real `province` query param, returned project coordinates in public/saved project lists, added full-title card tooltips, and improved sector-tinted cards/icons.
  - Relabeled project statuses in the UI only: `draft` displays as Concept, `rejected` as Not Approved, and `under_implementation` as Implementation Ongoing. No DB enum/value migration has been performed.
  - Added analytics aggregates for mapped CO2e mitigation and partially supported projects, plus dashboard KPIs, mitigation chart, NDC-target-pending message, and partial-support drill-down filtering.
  - Added logo-ready placeholders for partner/province presentation and expanded project detail "Ownership, Partners & Standards" with partner cards and carbon standard display.
  - Follow-up: public stats now include approved-project counts by sector and province; the home page renders a live approved-projects-by-sector chart, province coverage panel, and live sector tile counts with mock fallback.
  - Follow-up: completed a color consistency scan across the touched public/dashboard surfaces; findings were limited to expected token definitions, token-driven sector colors, and existing PCPP brand gradients.
  - Verification passed after the latest round: `node --check backend/routes/analytics.js`, `node --check backend/routes/admin.js`, `node --check backend/routes/projects.js`, `git diff --check`, and `npm run build` from `frontend/`.
  - Local smoke: root served on `http://localhost:3000`; a temporary CRA server on `http://localhost:3001` returned HTTP 200 for `/projects`, `/dashboard/submit`, and `/dashboard/analytics` when probed with browser-like `Accept: text/html` headers. The served bundle contained the new `Approved projects by sector` chart text. The temporary server was stopped after testing.
  - Browser plugin note: the in-app Browser connector failed to initialize in this local session with a path/setup error, so verification used HTTP route and bundle probes rather than a screenshot.

- `latest Add admin coordinate correction workflow`
  - Admin list/export now supports `coordinate_status=missing|valid`; All Projects includes a Missing Coordinates quick filter and coordinate status indicator in the Province column.
  - Added `PUT /api/admin/projects/:id/coordinates` with validation for Pakistan map bounds: latitude 23-38 and longitude 60-78.
  - All Projects drawer now has editable latitude/longitude fields, validation, clear/save actions, and a token-styled coordinate preview.
  - Follow-up: the drawer now supports current-page Previous/Next navigation and a Missing Coordinates queue-only Save & Next action.
  - Public project detail now shows a small location preview only when saved coordinates are valid.

- `latest Add analytics project map`
  - `/api/analytics/overview` now returns a role-scoped `map` payload with district aggregates and project latitude/longitude points.
  - Admin/superadmin receive the national coordinate set; provincial users receive only their own province through existing server-side province scoping.
  - Analytics page now shows a token-styled project map with district coverage stats, visible/geocoded/missing-coordinate counts, WEF-colored project points, and hover/focus tooltips with title, province/district, sector, status, lat/long, cost, and funding gap.
  - Existing analytics filters now also filter the visible map points.
  - Follow-up: analytics now also returns role-scoped `map.missing_projects`, removes the 250-row analytics drill-down cap, adds district filters/clickable district coverage rows, and exports the filtered missing-coordinate QA list as CSV.
  - Follow-up: admin/national analytics now links the missing-coordinate count to `/admin/projects?coordinate_status=missing`; map markers and drill-down project titles link to public project detail pages.

- `latest Align backend deploy entrypoint`
  - `backend/package.json` now starts `node server.js` instead of `node src/server.js`.
  - `backend/Dockerfile` now runs `server.js`.
  - This makes Render/Docker use the raw-pg `backend/routes/*` API that current work targets.

- `latest Add notification deep links`
  - New investment interest notifications now link to `/dashboard/projects?project=<id>&interests=1`.
  - `MyProjectsPage` reads that query string and auto-opens the received-interests panel.
  - New project submission notifications now link admins to the existing under-review workbench preset.

- `latest Add notifications inbox`
  - Added `/dashboard/notifications` page with unread count, mark-one-read, mark-all-read, and open linked notification.
  - Added Notifications sidebar link for admin, investor, provincial, and standard dashboard roles.
  - Dashboard bell now links to the notifications inbox.
  - Notification parser supports both raw-pg `{ notifications }` and older Sequelize `{ data }` response shapes.

- `latest Polish investor interest workflow`
  - Project detail now detects existing user interest and disables duplicate submissions.
  - Express Interest modal now captures investment intent, timeline, and preferred contact method inside the stored note.
  - `/dashboard/interests` now shows richer project, finance, message, and owner-response context.
  - Project owners can open received interests from My Projects, see investor contact details, and reply inline.

- `latest Add investor saved-projects flow`
  - Added live raw-pg `GET /api/projects/saved` route for the current user's saved projects.
  - Added `/dashboard/saved` page and investor sidebar link.
  - Project detail page now supports Save Project / Saved using existing save toggle API.
  - Investor dashboard now counts saved projects and links to the saved list.
  - Project card "Invest Now" CTA now opens the project detail page instead of being inert.

- `latest Relax Render API rate limiting`
  - Both backend entrypoints now set `trust proxy` for Render/proxy IP handling.
  - Global API limit raised from 100/15min to env-configurable `API_RATE_LIMIT_MAX` defaulting to 1000.
  - Login has a separate env-configurable `AUTH_RATE_LIMIT_MAX` defaulting to 50/15min.
  - Successful login requests are not counted against the auth limiter.

- `latest Clarify investor registration flow`
  - Public `/register` now explicitly creates active `investor` accounts in the backend.
  - Investor sidebar now focuses on Dashboard, Browse Projects, My Interests, and Settings.
  - Investor dashboard now shows available projects, interests sent, owner replies, unread alerts, and recent interests.
  - Investor accounts are blocked from project submission both in the UI and backend project-create route.
  - Login/register redirects now send admin/superadmin to `/admin`; all other roles go to `/dashboard`.

- `latest Add URL-backed admin project filters`
  - All Projects workbench now reads/writes `search`, `status`, `sector`, `province`, `district`, `priority`, `sort_by`, `sort_dir`, and `page` from the URL query string.
  - Admin dashboard "Review now" and sidebar "Pending review" now open `/admin/projects?status=under_review&sort_by=created_at&sort_dir=asc`.
  - Legacy Pending Review page remains available, but its workbench shortcut now opens the filtered workbench.

- `latest Add review audit context`
  - Admin project detail endpoint now returns reviewer name/email.
  - All Projects drawer now shows Review History when review notes/metadata exist.
  - Review History includes reviewed by, reviewed at, and existing review notes.

- `latest Align pending review page`
  - `AdminReviewPage.jsx` now uses `adminAPI.getProjects` instead of the public projects API.
  - Pending Review now sends `notes` to the review endpoint instead of `feedback`.
  - Reject and Request Changes require notes on the Pending Review page too.
  - Added a shortcut from Pending Review to the All Projects review workbench.

- `latest Add drawer review workflow`
  - Detail drawer now shows a Review Decision panel for `under_review` and `changes_requested` projects.
  - Drawer supports Approve, Request Changes, and Reject with notes.
  - Reject and Request Changes require notes before submission.
  - Backend review route now accepts both `notes` and legacy `feedback`.
  - Backend review route stores `admin_notes`, `admin_feedback`, `reviewed_by`, and `reviewed_at`.

- `latest Add admin project quick filters`
  - Added quick filter chips for All Projects, Pending Review, Approved, Archived, and High Priority.
  - High Priority includes both `high` and `critical` priority levels.
  - Added removable active Province chip and Clear filters action.
  - Backend admin list/export now support `priority`, including `high_or_critical`.

- `latest Improve admin project table density`
  - Added Title and Organization to the safe backend sort whitelist.
  - Made Project and Organization sortable columns.
  - Added Comfortable/Compact density toggle on All Projects.
  - Added horizontal table scrolling with a stable minimum table width for smaller screens.
  - Tightened table padding in compact mode while preserving the existing drawer/actions workflow.

- `latest Add admin workbench action safeguards`
  - Added confirmation modal before bulk approve/archive.
  - Made All Projects rows open the project detail drawer directly.
  - Stopped checkbox and row action clicks from opening the drawer accidentally.

- `pending Add admin project detail drawer`
  - Added `GET /api/admin/projects/:id/detail` for admin-only drawer data.
  - Added `adminAPI.getProject`.
  - Added a right-side detail drawer on All Projects.
  - Drawer shows status, TRL, cost, funding gap, ROI, jobs, sector, province/district/city, priority/risk, owner, activity counts, timeline, and abstract.
  - Drawer supports quick approve/archive and links to the full public project page.

- `0933a0e Enhance admin project workbench`
  - Added backend single-project status route for inline approve/archive.
  - Added backend bulk status route for selected projects.
  - Added frontend row selection, select-all-on-page, bulk approve/archive, and export selected.
  - Added cascading District filter after Province on All Projects.
  - Added safe backend sort whitelist and server-side sort params for project list/export.
  - Added sortable table headers for Sector, Province, Status, Cost, and Created.
  - Added Created date column and district text under Province.

- `5917f8e Add province filter and numbered project pagination`
  - Added Province filter to All Projects.
  - Backend `/api/admin/projects` now accepts `province`.
  - `/api/admin/projects/export` also respects `province`.
  - Added Province column in All Projects table.
  - Replaced simple Prev/Next with First, Previous, numbered pages with ellipses, Next, Last.

- `c8126c4 Improve project list export and sector icons`
  - All Projects now requests 25 projects per page instead of 10.
  - Export button now downloads `pcpp-projects.xlsx`.
  - Export respects status/sector/search filters and includes Province, City, Owner Email.
  - Submit Project sector tiles now use sector-specific Lucide icons instead of repeated lightning icons.

- `01e6b70 Add analytics table filters and export`
  - Analytics page got manual filters for sector/lifecycle/TRL/province.
  - Chart-click filtering still works.
  - Added clear filters, visible-row CSV export, lifecycle column, and empty state.

- `680e4f7 Fix project update ownership columns`
  - Fixed project updates to use `projects.user_id` and `project_updates.user_id`.
  - Provincial users can post updates only for same-province projects.
  - Create accepts frontend `total_cost` as well as old `total_project_cost`.

- `4bbe9d0 Add role-aware analytics dashboard`
  - Added `/api/analytics` and `/api/analytics/overview`.
  - Admin/superadmin see national analytics.
  - Provincial users see server-side province-scoped analytics.
  - Added `AnalyticsPage.jsx`, sidebar route, and `analyticsAPI.getOverview`.

- `4eab78d Fix investor interest flow columns and routes`
  - Fixed interest flow to use real columns.
  - Supports current and legacy interest/reply route shapes.

- `ee0138a Merge Phase I finishing touches`
  - Replaced emoji dashboard icons with Lucide.
  - Rebranded landing page with Part A/Part B tokens and logo.
  - Fixed public stats to use `total_cost`.
  - Added thousand separators and currency suffix formatting.

## 5. Data State Notes

- AJK/GB data has already been bulk imported by another tool.
- User verified counts:
  - `Gilgit-Baltistan`: 140 projects
  - `Azad Jammu and Kashmir`: 64 projects
- User also verified province spellings exactly:
  - `Gilgit-Baltistan`
  - `Azad Jammu and Kashmir`
- Do not restart the AJK/GB import unless asked. It was intentionally paused/deferred as a separate cleanup topic.

## 6. Current Focus / Next Actions

Phase II WP-0 (Schema & Data Foundation) was applied to the live Render `pcpp_db` production database through pgAdmin on 2026-07-16: `006_move_critical_priority_to_risk.sql`, `007_add_mitigation.sql`, and `008_phase2_wef_nexus.sql` completed successfully. The funding-source taxonomy contains all 9 rows, and `009_seed_districts.sql` seeded 167 national district records. This database was originally migrated/uploaded to Render and subsequently populated with live projects; do not treat it as a disposable development database. `backend/scripts/seed_districts.js` remains available for direct database connections, while `/api/meta/districts` plus `/api/meta/funding-source-types` expose the new reference data.

The pre-Phase-II production backup is at `D:\dbbackup\dbbackup.sql` (PostgreSQL custom format despite its `.sql` extension; restore with pgAdmin Restore / `pg_restore`, not Query Tool).

WP-1 (Storage & Documents) is also implemented locally, pending R2 infrastructure configuration: uploads are buffered in memory, stored through an R2-compatible adapter, and extract PDF/DOCX text for Phase II search. The existing `POST /api/projects/:id/documents` path now accepts `file` (legacy) or `files` (multi-file), checks owner/admin/provincial scope, and writes category, visibility, storage, MIME, and extracted-text fields. New authenticated `GET /api/documents/:docId/download` and `DELETE /api/documents/:docId` routes preserve visibility rules. Production uploads deliberately fail without `STORAGE_DRIVER=r2` plus the required Cloudflare R2 credentials; see `backend/.env.example`. Local fallback round-trip testing passed. An R2 bucket and uploaded PDF/DOCX test documents are still required for end-to-end validation.

Phase II implementation status (2026-07-18):
- WP-1 local code complete: R2-compatible storage adapter, memory-buffered multi-file uploads, PDF/DOCX text extraction, visibility-aware download/delete routes, and local fallback verification. Render deployment still requires the R2 credentials in `backend/.env.example`.
- WP-2 implemented locally: Phase II fields, phases, districts, funding sources, feasibility links, approvals, document/gallery upload, project detail rendering, and edit round-trip are wired.
- WP-3 implemented locally: `GET /api/search` searches project vectors and extracted document text with fuzzy-title fallback; `/search` results page and public-header entry are wired. End-to-end search still needs uploaded PDF/DOCX test data.
- WP-4 in progress: backend project listing accepts `priority=WEF`; `/invest` provides WEF portfolio KPIs and sector cards, `/invest/sector/:sector` drills into approved WEF projects, public navigation exposes Invest/Search, coverage is reported as X/7, and project detail links to the NDC Partnership Climate Funds Explorer.
- WP-5 implemented locally: `/api/analytics/public?portfolio=wef|all` provides finance, funding-source, sector, province, stage, and carbon summaries. Public `/analytics` provides the portfolio toggle, KPI strip, finance funnel, source bars, and Carbon Mitigation Summary.
- Frontend production build passed on 2026-07-18 with `DISABLE_ESLINT_PLUGIN=true`; the normal CRA ESLint cache file is locked/permission-denied in this environment, but compilation completed successfully.
- Live frontend wiring corrected on 2026-07-20: `/search`, `/invest`, `/invest/sector/:sector`, and public `/analytics` were ported from dead `src/App.jsx` into active `src/App.js`; Invest, Analytics, and Search navigation links were added to active `src/components/layout/Navbar.jsx`. The production build passed with `DISABLE_ESLINT_PLUGIN=true`.

The current UI thread is WEF Round 2 polish and conservative gated improvements. Packages A/B/C are implemented, and several gated items are implemented under stakeholder-safe assumptions.

Recommended next steps before deployment:

1. Configure the Render backend with `STORAGE_DRIVER=r2` and the Cloudflare R2 credentials documented in `backend/.env.example`.
2. Re-run `npm run build` from `frontend/` and backend syntax checks before pushing.
3. Do a browser smoke test for `/dashboard/submit`, `/projects`, `/dashboard/analytics`, `/admin`, and a public project detail page once the local server can serve SPA deep links correctly.
4. Verify admin filters: High Priority / Critical Risk should include high-priority projects and critical-risk projects.
5. Verify public project filters: province should filter independently from district, and the map should show only valid coordinate points.
6. Verify analytics: CO2e mitigation KPIs should use existing mitigation data; NDC target should remain explicitly marked as pending until a stakeholder-approved target/reference is provided.

Remaining Round 2 items:

1. Official SDG icons, partner logos, investor logos, and province/region marks once approved assets are provided.
2. Partner/investor standards normalization if stakeholders want more than the current JSON/field-based presentation.
3. Optional true DB status-value migration if stakeholders decide labels alone are insufficient.

## 7. Provincial Permission Model - Current Understanding

Provincial users should see analytics and projects only for their own province. Admin retains full visibility and approval power. Imported projects are often admin-owned, so province scoping must use the project `province` field, not ownership.

Already done:
- Role-aware analytics with server-side province scoping.
- Provincial analytics route/sidebar access.
- Project updates guarded for provincial users by province.
- Submit Project locks province for provincial users in the form, with server-side enforcement expected in routes.

Important test expectation:
- Provincial user logs in, sees only own-province data, cannot approve/admin-manage all projects, and direct cross-province API access should fail or return no data.

## 8. How To Continue Safely

1. Start with `git status --short`.
2. Ignore unrelated dirty files listed in section 2 unless the user explicitly asks about them.
3. Inspect active files before editing:
   - `frontend/src/pages/admin/AdminProjectsPage.jsx`
   - `backend/routes/admin.js`
   - `frontend/src/services/api.js`
   - `frontend/src/pages/dashboard/SubmitProjectPage.jsx`
   - `frontend/src/pages/dashboard/AnalyticsPage.jsx`
4. For frontend changes, run `npm run build` in `frontend/`.
5. Commit only intended files and push `main` if the user wants deployment.
