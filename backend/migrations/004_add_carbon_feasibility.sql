-- 004_add_carbon_feasibility.sql
-- Adds A3 (carbon-market readiness) and A4 (feasibility) fields to projects.
--
-- These columns do NOT yet exist in the live DB. Run this manually against the
-- Render Postgres (pgAdmin / External DB URL) BEFORE deploying the backend that
-- writes them, otherwise project creation will fail with 42703.
-- Idempotent: safe to run more than once.

-- A3: Carbon-market readiness (qualitative; CO2 quantities belong to C1)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carbon_market_relevant BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carbon_standard VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carbon_methodology VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carbon_credit_status VARCHAR(50);

-- A4: Feasibility
ALTER TABLE projects ADD COLUMN IF NOT EXISTS feasibility_status VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS feasibility_study_url VARCHAR(500);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS feasibility_notes TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS land_acquired BOOLEAN DEFAULT FALSE;
