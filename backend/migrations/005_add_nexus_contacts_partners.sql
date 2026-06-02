-- 005_add_nexus_contacts_partners.sql
-- B3: WEF (Water-Energy-Food) nexus tagging.
-- B4: line ministry + provincial contacts + partners.
--
-- These columns do NOT yet exist in the live DB. Run this manually against the
-- Render Postgres (pgAdmin / External DB URL) BEFORE deploying the backend that
-- writes them, otherwise project creation will fail with 42703.
-- Idempotent: safe to run more than once.

-- B3: WEF nexus (a project can touch one or more of Water / Energy / Food)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS wef_nexus TEXT[];

-- B4: ownership + partners
ALTER TABLE projects ADD COLUMN IF NOT EXISTS line_ministry VARCHAR(150);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS provincial_contacts JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS partners JSONB;
