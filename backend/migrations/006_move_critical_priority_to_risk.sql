-- Move "critical" from project priority to project risk.
-- Run manually against the live PostgreSQL database before enabling critical risk submissions.

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_risk_level_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_risk_level_check
  CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));

UPDATE projects
SET risk_level = 'critical',
    priority_level = 'high',
    updated_at = NOW()
WHERE priority_level = 'critical';

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_priority_level_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_priority_level_check
  CHECK (priority_level IN ('low', 'medium', 'high'));
