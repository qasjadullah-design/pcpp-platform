require('dotenv').config({ path: '../.env' });
const pool = require('./pool');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // USERS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        organization VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        password_hash VARCHAR(255) NOT NULL,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMPTZ,
        avatar_url VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // PROJECTS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_code VARCHAR(20) UNIQUE,
        title VARCHAR(500) NOT NULL,
        abstract TEXT NOT NULL,
        description TEXT,
        
        -- Sector
        primary_sector VARCHAR(100),
        sub_sectors TEXT[],
        
        -- SDG & TRL
        sdg_goals INTEGER[],
        trl_level INTEGER CHECK (trl_level BETWEEN 1 AND 9),
        
        -- Status & Priority
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','rejected','changes_requested','under_implementation','completed')),
        risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
        priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low','medium','high')),
        
        -- Timeline & Location
        duration_months INTEGER,
        start_date DATE,
        expected_completion DATE,
        country VARCHAR(100) DEFAULT 'Pakistan',
        district VARCHAR(100),
        city VARCHAR(100),
        address TEXT,
        
        -- Financial (all in selected currency)
        currency VARCHAR(10) DEFAULT 'PKR',
        total_project_cost BIGINT,
        research_fund BIGINT,
        equity_fund BIGINT,
        debt_loan BIGINT,
        grant_amount BIGINT,
        funding_gap BIGINT,
        min_investment BIGINT,
        expected_roi DECIMAL(5,2),
        payback_years DECIMAL(5,2),
        
        -- Impact
        direct_beneficiaries INTEGER,
        indirect_beneficiaries INTEGER,
        jobs_created INTEGER,
        
        -- Organization
        organization_name VARCHAR(255),
        organization_type VARCHAR(100),
        organization_website VARCHAR(500),
        
        -- Media
        infographic_url VARCHAR(500),
        
        -- Tags
        tags TEXT[],
        
        -- Admin
        admin_notes TEXT,
        progress_percent INTEGER DEFAULT 0,
        
        -- Relationships
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // PROJECT SDG alignment (normalized)
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_sdgs (
        id SERIAL PRIMARY KEY,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        sdg_number INTEGER NOT NULL CHECK (sdg_number BETWEEN 1 AND 17)
      );
    `);

    // PROJECT SHAREHOLDERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_shareholders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        share_percent DECIMAL(5,2),
        amount BIGINT,
        contact_email VARCHAR(255),
        website VARCHAR(500),
        status VARCHAR(50) DEFAULT 'discussion',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // PROJECT TEAM MEMBERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_team (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        is_lead BOOLEAN DEFAULT false,
        full_name VARCHAR(255) NOT NULL,
        designation VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        website VARCHAR(500),
        linkedin VARCHAR(500),
        twitter VARCHAR(500),
        facebook VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // PROJECT DOCUMENTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_size INTEGER,
        uploaded_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // PROJECT VIDEOS
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(500),
        url VARCHAR(500) NOT NULL,
        duration VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // PROJECT FUTURE PLANS
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_future_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        phase_name VARCHAR(255),
        title VARCHAR(500),
        timeline VARCHAR(100),
        description TEXT,
        estimated_cost BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // PROJECT LINKED PROJECTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_links (
        id SERIAL PRIMARY KEY,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        linked_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, linked_project_id)
      );
    `);

    // PROJECT IMPACT METRICS
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_impact_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        metric_name VARCHAR(255) NOT NULL,
        value VARCHAR(255),
        unit VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // PROJECT UPDATES
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        author_id UUID REFERENCES users(id),
        update_type VARCHAR(50) DEFAULT 'general' CHECK (update_type IN ('milestone','progress','funding','construction','team','issue','announcement','general')),
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // INVESTOR INTERESTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS interests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        investor_id UUID REFERENCES users(id) ON DELETE CASCADE,
        investment_range_min BIGINT,
        investment_range_max BIGINT,
        message TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','owner_replied','closed')),
        owner_reply TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(project_id, investor_id)
      );
    `);

    // SAVED PROJECTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_projects (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, project_id)
      );
    `);

    // NOTIFICATIONS
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
        is_read BOOLEAN DEFAULT false,
        link VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ADMIN INVITATIONS
    await client.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        token VARCHAR(255) UNIQUE NOT NULL,
        invited_by UUID REFERENCES users(id),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_district ON projects(district);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_sector ON projects(primary_sector);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_interests_investor ON interests(investor_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_interests_project ON interests(project_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`);

    // Auto-generate project_code trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_project_code()
      RETURNS TRIGGER AS $$
      DECLARE
        next_num INTEGER;
      BEGIN
        SELECT COUNT(*) + 1 INTO next_num FROM projects;
        NEW.project_code := 'PCH-PRJ-' || LPAD(next_num::TEXT, 4, '0');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS set_project_code ON projects;
      CREATE TRIGGER set_project_code
        BEFORE INSERT ON projects
        FOR EACH ROW
        WHEN (NEW.project_code IS NULL)
        EXECUTE FUNCTION generate_project_code();
    `);

    // updated_at trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    for (const tbl of ['users', 'projects', 'interests']) {
      await client.query(`
        DROP TRIGGER IF EXISTS set_updated_at ON ${tbl};
        CREATE TRIGGER set_updated_at BEFORE UPDATE ON ${tbl}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      `);
    }

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

migrate();
