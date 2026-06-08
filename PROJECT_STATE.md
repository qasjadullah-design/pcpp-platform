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

The current UI thread is registration and role-specific investor experience.

Recommended next step: verify the live investor signup/login, save, interest, owner-reply, and notification paths on Render.

1. Register a test investor from `/register`; confirm DB role is `investor`, status is `active`, and login lands on `/dashboard`.
2. Save an approved project from its detail page; confirm it appears in `/dashboard/saved`.
3. Express interest in an approved project; confirm `/dashboard/interests` and owner notification update.
4. Login as the project owner; open the notification and confirm My Projects auto-opens the correct interest panel.
5. Open `/dashboard/notifications`; mark one and all notifications read.

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
