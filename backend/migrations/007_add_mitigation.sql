-- 007_add_mitigation.sql
-- C1: quantitative CO2 mitigation with a unit toggle + a normalized tonnes column.
--
-- Run in pgAdmin against the Render DB BEFORE deploying the backend that writes
-- these (project creation will 42703 otherwise). Idempotent.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS mitigation_value NUMERIC(20,2);   -- raw value as entered
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mitigation_unit VARCHAR(20);      -- kgCO2e | tCO2e | ktCO2e | MtCO2e
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mitigation_basis VARCHAR(20);     -- annual | lifetime
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mitigation_tco2e NUMERIC(20,2);   -- normalized to tonnes CO2e (for aggregation)

CREATE INDEX IF NOT EXISTS idx_projects_mitigation_tco2e ON projects(mitigation_tco2e);
