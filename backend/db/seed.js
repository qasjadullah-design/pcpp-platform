require('dotenv').config({ path: '../.env' });
const pool = require('./pool');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Admin user
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const adminId = uuidv4();
    await client.query(`
      INSERT INTO users (id, first_name, last_name, email, phone, organization, role, status, password_hash)
      VALUES ($1, 'Admin', 'PCPP', 'admin@bcpp.gov.pk', '+92-81-1234567', 'Pakistan IT Board', 'admin', 'active', $2)
      ON CONFLICT (email) DO NOTHING
    `, [adminId, adminHash]);

    // Sample user
    const userHash = await bcrypt.hash('User@123', 12);
    const userId = uuidv4();
    await client.query(`
      INSERT INTO users (id, first_name, last_name, email, phone, organization, role, status, password_hash)
      VALUES ($1, 'Ahmed', 'Baloch', 'ahmed@bda.gov.pk', '+92-300-1234567', 'Pakistan Development Authority', 'user', 'active', $2)
      ON CONFLICT (email) DO NOTHING
    `, [userId, userHash]);

    // Sample investor
    const invHash = await bcrypt.hash('Inv@12345', 12);
    const invId = uuidv4();
    await client.query(`
      INSERT INTO users (id, first_name, last_name, email, phone, organization, role, status, password_hash)
      VALUES ($1, 'Sara', 'Mengal', 'sara@investment.pk', '+92-301-9876543', 'Pakistan Investment Group', 'user', 'active', $2)
      ON CONFLICT (email) DO NOTHING
    `, [invId, invHash]);

    // Sample projects
    const projects = [
      {
        title: 'Gwadar Solar Power Initiative Phase I',
        abstract: '300MW solar power generation project to provide clean energy to 1.5 million households in Gwadar and surrounding areas.',
        primary_sector: 'Energy & Power',
        district: 'Gwadar',
        city: 'Gwadar',
        status: 'approved',
        trl_level: 7,
        total_project_cost: 25000000000,
        funding_gap: 12000000000,
        expected_roi: 13.5,
        payback_years: 8,
        direct_beneficiaries: 1500000,
        jobs_created: 2000,
        organization_name: 'Pakistan Energy Department',
        tags: ['solar', 'energy', 'gwadar', 'CPEC'],
        sdg_goals: [7, 8, 13]
      },
      {
        title: 'Quetta Metro Bus Rapid Transit',
        abstract: 'Modern bus rapid transit system covering 35km across Quetta metropolitan area, serving 400,000 daily commuters.',
        primary_sector: 'Transport & Logistics',
        district: 'Quetta',
        city: 'Quetta',
        status: 'approved',
        trl_level: 6,
        total_project_cost: 35000000000,
        funding_gap: 20000000000,
        expected_roi: 11.0,
        payback_years: 10,
        direct_beneficiaries: 400000,
        jobs_created: 1500,
        organization_name: 'Quetta Development Authority',
        tags: ['transport', 'quetta', 'urban'],
        sdg_goals: [11, 13]
      },
      {
        title: 'Pakistan Rural Health Initiative',
        abstract: 'Construction of 8 district hospitals with 300 beds each across underserved districts of Pakistan.',
        primary_sector: 'Health & Medical',
        district: 'Multiple Districts',
        city: 'Multiple',
        status: 'under_review',
        trl_level: 5,
        total_project_cost: 15000000000,
        funding_gap: 8000000000,
        expected_roi: 9.5,
        payback_years: 12,
        direct_beneficiaries: 2000000,
        jobs_created: 3000,
        organization_name: 'Pakistan Health Department',
        tags: ['health', 'hospitals', 'rural'],
        sdg_goals: [3, 10]
      },
      {
        title: 'Makran Coastal Fisheries Development',
        abstract: 'Modernization of fishing infrastructure along Makran coast including cold storage, processing plants and fishing vessels.',
        primary_sector: 'Agriculture & Food',
        district: 'Turbat',
        city: 'Turbat',
        status: 'approved',
        trl_level: 6,
        total_project_cost: 8000000000,
        funding_gap: 4000000000,
        expected_roi: 16.0,
        payback_years: 6,
        direct_beneficiaries: 300000,
        jobs_created: 5000,
        organization_name: 'Pakistan Fisheries Department',
        tags: ['fisheries', 'makran', 'coastal', 'agriculture'],
        sdg_goals: [2, 8, 14]
      },
      {
        title: 'Saindak Copper Mining Expansion',
        abstract: 'Expansion of Saindak copper-gold project to increase production capacity by 200% with modern extraction technology.',
        primary_sector: 'Industry & Manufacturing',
        district: 'Chagai',
        city: 'Saindak',
        status: 'approved',
        trl_level: 8,
        total_project_cost: 50000000000,
        funding_gap: 25000000000,
        expected_roi: 22.0,
        payback_years: 5,
        direct_beneficiaries: 100000,
        jobs_created: 4000,
        organization_name: 'Saindak Metals Limited',
        tags: ['mining', 'copper', 'chagai', 'CPEC'],
        sdg_goals: [8, 9, 17]
      },
      {
        title: 'Pakistan Tech Hub Quetta',
        abstract: 'State-of-the-art technology park with incubation facilities, co-working spaces and IT training centers in Quetta.',
        primary_sector: 'Technology & IT',
        district: 'Quetta',
        city: 'Quetta',
        status: 'planning',
        trl_level: 3,
        total_project_cost: 3000000000,
        funding_gap: 2000000000,
        expected_roi: 18.0,
        payback_years: 7,
        direct_beneficiaries: 50000,
        jobs_created: 2000,
        organization_name: 'Pakistan IT Board',
        tags: ['technology', 'IT', 'quetta', 'startup'],
        sdg_goals: [8, 9, 17]
      }
    ];

    for (const p of projects) {
      const projId = uuidv4();
      await client.query(`
        INSERT INTO projects (
          id, title, abstract, primary_sector, district, city, status, trl_level,
          currency, total_project_cost, funding_gap, expected_roi, payback_years,
          direct_beneficiaries, jobs_created, organization_name, tags, owner_id, progress_percent
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PKR',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      `, [
        projId, p.title, p.abstract, p.primary_sector, p.district, p.city,
        p.status, p.trl_level, p.total_project_cost, p.funding_gap,
        p.expected_roi, p.payback_years, p.direct_beneficiaries, p.jobs_created,
        p.organization_name, p.tags, userId,
        p.status === 'approved' ? Math.floor(Math.random() * 60) + 20 : 0
      ]);

      // Insert SDGs
      for (const sdg of p.sdg_goals) {
        await client.query(
          `INSERT INTO project_sdgs (project_id, sdg_number) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [projId, sdg]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
    console.log('👤 Admin: admin@bcpp.gov.pk / Admin@123');
    console.log('👤 User:  ahmed@bda.gov.pk / User@123');
    console.log('👤 Investor: sara@investment.pk / Inv@12345');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

seed();
