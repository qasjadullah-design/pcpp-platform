-- Aligned schema with Sequelize models (users, projects, interests, notifications)
-- Run via docker-entrypoint or npm run migrate

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS TABLE ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  organization VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'investor' CHECK (role IN ('admin','project_owner','investor','government','ngo')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  avatar VARCHAR(500),
  password VARCHAR(255) NOT NULL,
  reset_password_token VARCHAR(255),
  reset_password_expire TIMESTAMPTZ,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verify_token VARCHAR(255),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- PROJECTS TABLE ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  abstract TEXT NOT NULL,
  description TEXT,
  primary_sector VARCHAR(100) NOT NULL,
  sub_sectors TEXT[],
  sdg_goals INTEGER[],
  trl_level INTEGER CHECK (trl_level BETWEEN 1 AND 9),
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','rejected','changes_requested','under_implementation','completed')),
  priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low','medium','high')),
  risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  district VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  start_date DATE,
  end_date DATE,
  duration_months INTEGER,
  currency VARCHAR(10) DEFAULT 'PKR',
  total_cost DECIMAL(20,2),
  research_fund DECIMAL(20,2),
  equity_fund DECIMAL(20,2),
  debt_loan DECIMAL(20,2),
  grant_amount DECIMAL(20,2),
  funding_gap DECIMAL(20,2),
  minimum_investment DECIMAL(20,2),
  expected_roi DECIMAL(5,2),
  payback_years INTEGER,
  direct_beneficiaries INTEGER,
  indirect_beneficiaries INTEGER,
  jobs_created INTEGER,
  impact_metrics JSONB,
  organization_name VARCHAR(200),
  organization_type VARCHAR(100),
  organization_website VARCHAR(500),
  project_lead JSONB,
  team_members JSONB,
  shareholders JSONB,
  documents JSONB,
  videos JSONB,
  future_plans JSONB,
  tags TEXT[],
  infographic_url VARCHAR(500),
  admin_notes TEXT,
  admin_feedback TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  interests_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_sector ON projects(primary_sector);
CREATE INDEX IF NOT EXISTS idx_projects_district ON projects(district);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(user_id);

-- PROJECT UPDATES ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  update_type VARCHAR(50) DEFAULT 'general' CHECK (update_type IN ('milestone','progress','funding','construction','team','issue','announcement','general')),
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id);

-- INTERESTS ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  investment_range_min DECIMAL(20,2),
  investment_range_max DECIMAL(20,2),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','owner_replied','closed')),
  owner_response TEXT,
  owner_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_interests_project ON interests(project_id);
CREATE INDEX IF NOT EXISTS idx_interests_user ON interests(user_id);

-- SAVED PROJECTS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- NOTIFICATIONS ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- TRIGGERS -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE tbl TEXT; BEGIN
  FOR tbl IN SELECT unnest(ARRAY['users','projects','project_updates','interests','notifications','saved_projects'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I;', tbl);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();', tbl);
  END LOOP;
END $$;
