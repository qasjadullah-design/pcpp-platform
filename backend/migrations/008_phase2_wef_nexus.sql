-- Phase II — WEF Nexus schema and reference-data foundation.
-- Run manually against Render PostgreSQL only after a backup and live-schema snapshot.
-- Additive and idempotent; apply 006_move_critical_priority_to_risk.sql first.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text AS $$ SELECT array_to_string($1, $2) $$
LANGUAGE sql IMMUTABLE;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS secondary_sector VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS wef_pillars TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage VARCHAR(30);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carbon_credit_methodology VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS feasibility_type VARCHAR(30);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_loi_los BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_departmental BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_mocc_notification BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approvals_answered_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS climate_finance_available BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS climate_finance_amount NUMERIC(20,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carbon_finance_option BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carbon_finance_notes TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_co2_reduction NUMERIC(20,2);

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_priority_level_check;
ALTER TABLE projects ADD CONSTRAINT projects_priority_level_check
  CHECK (priority_level IS NULL OR priority_level IN ('WEF', 'critical', 'high', 'medium', 'low'));
CREATE INDEX IF NOT EXISTS idx_projects_wef ON projects (priority_level) WHERE priority_level = 'WEF';

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_stage_check;
ALTER TABLE projects ADD CONSTRAINT projects_stage_check
  CHECK (stage IS NULL OR stage IN ('concept', 'planning', 'development', 'under_implementation', 'scale_up', 'completed'));
UPDATE projects SET stage = 'under_implementation' WHERE stage IS NULL AND status = 'under_implementation';
UPDATE projects SET stage = 'completed' WHERE stage IS NULL AND status = 'completed';

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_feasibility_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_feasibility_type_check
  CHECK (feasibility_type IS NULL OR feasibility_type IN ('pre_feasibility', 'detailed_feasibility', 'both', 'none_yet'));
UPDATE projects SET carbon_credit_methodology = 'not_decided'
WHERE carbon_credit_methodology IS NULL OR lower(carbon_credit_methodology) IN ('none', 'n/a', '');

ALTER TABLE projects ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(abstract, '') || ' ' ||
      coalesce(description, '') || ' ' || coalesce(immutable_array_to_string(tags, ' '), ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_projects_search_vector ON projects USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_projects_title_trgm ON projects USING GIN (title gin_trgm_ops);

CREATE TABLE IF NOT EXISTS districts (
  id SERIAL PRIMARY KEY,
  province VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (province, name)
);
CREATE INDEX IF NOT EXISTS idx_districts_province_name ON districts (province, name);

CREATE TABLE IF NOT EXISTS funding_source_types (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(150) NOT NULL,
  sort_order SMALLINT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO funding_source_types (code, label, sort_order) VALUES
  ('public_sector', 'Public Sector', 1),
  ('mdb_loans', 'MDBs Loans', 2),
  ('un_agencies', 'UN Agencies', 3),
  ('ingos_ngos', 'INGOs / NGOs', 4),
  ('private_sector', 'Private Sector', 5),
  ('international_climate_finance', 'International Climate Finance Windows', 6),
  ('carbon_finance', 'Carbon Finance Windows', 7),
  ('iga', 'IGA', 8),
  ('gggi_un', 'GGGI / UN', 9)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS project_districts (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, district_id)
);
CREATE INDEX IF NOT EXISTS idx_project_districts_district ON project_districts (district_id);

CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_name VARCHAR(255) NOT NULL,
  phase_order SMALLINT NOT NULL,
  start_date DATE,
  end_date DATE,
  duration_months INTEGER,
  status VARCHAR(30),
  estimated_cost NUMERIC(20,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, phase_order),
  CHECK (duration_months IS NULL OR duration_months >= 0),
  CHECK (estimated_cost IS NULL OR estimated_cost >= 0)
);

CREATE TABLE IF NOT EXISTS project_funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL REFERENCES funding_source_types(code),
  provider_name VARCHAR(255),
  instrument VARCHAR(100),
  amount NUMERIC(20,2),
  currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
  status VARCHAR(30) NOT NULL DEFAULT 'pipeline',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount IS NULL OR amount >= 0),
  CHECK (status IN ('secured', 'committed', 'pipeline', 'requested'))
);
CREATE INDEX IF NOT EXISTS idx_project_funding_sources_project ON project_funding_sources (project_id);
CREATE INDEX IF NOT EXISTS idx_project_funding_sources_type ON project_funding_sources (source_type);

CREATE TABLE IF NOT EXISTS project_feasibility_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_feasibility_links_project ON project_feasibility_links (project_id);

ALTER TABLE project_team ADD COLUMN IF NOT EXISTS team_name VARCHAR(255);

ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS title VARCHAR(500);
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'other';
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'registered';
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS storage_key VARCHAR(1000);
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(255);
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(file_name, '') || ' ' || coalesce(extracted_text, ''))
  ) STORED;
ALTER TABLE project_documents DROP CONSTRAINT IF EXISTS project_documents_visibility_check;
ALTER TABLE project_documents ADD CONSTRAINT project_documents_visibility_check
  CHECK (visibility IN ('public', 'registered', 'private'));
CREATE INDEX IF NOT EXISTS idx_project_documents_search_vector ON project_documents USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents (project_id);

COMMIT;
