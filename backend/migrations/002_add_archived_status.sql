-- Add 'archived' to the project status enum and update default
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft','under_review','approved','rejected','changes_requested','under_implementation','completed','archived'));

ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'under_review';
