-- 003_add_province.sql
-- Ensures the projects.province column exists.
--
-- Context: the live DB already has a `province` column (created via the Sequelize
-- model when the ADP/PSDP bulk import ran), but it was never in the committed
-- migrations (001/002) -- schema drift. The live raw-pg routes now read/write
-- province (submit form -> create handler, and the admin dashboard By Province
-- card), so this guarantees the column is present and prevents 42703 errors.
--
-- Idempotent: a no-op if the column already exists (incl. as the existing ENUM).
-- Run manually against the Render Postgres (pgAdmin / External DB URL).

ALTER TABLE projects ADD COLUMN IF NOT EXISTS province VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_projects_province ON projects(province);
