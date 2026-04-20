require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, connectDB } = require('../src/config/database');
const { User, Project } = require('../src/models');

const seed = async () => {
  await connectDB();

  // Admin User
  const admin = await User.findOrCreate({
    where: { email: 'admin@bcpp.gov.pk' },
    defaults: {
      first_name: 'Admin', last_name: 'User', email: 'admin@bcpp.gov.pk',
      password: 'Admin@123456', role: 'admin', status: 'active',
      organization: 'PCPP Administration',
    }
  });

  // Test Investor
  const investor = await User.findOrCreate({
    where: { email: 'investor@hbl.com' },
    defaults: {
      first_name: 'Abdul', last_name: 'Rahman', email: 'investor@hbl.com',
      password: 'Test@123456', role: 'investor', status: 'active',
      organization: 'HBL Investment Division',
    }
  });

  // Test Project Owner
  const owner = await User.findOrCreate({
    where: { email: 'energy@balochistan.gov.pk' },
    defaults: {
      first_name: 'Sara', last_name: 'Ali', email: 'energy@balochistan.gov.pk',
      password: 'Test@123456', role: 'project_owner', status: 'active',
      organization: 'Pakistan Energy Department',
    }
  });

  // Sample Projects
  const projects = [
    {
      title: 'Quetta Solar Power Initiative Phase I',
      abstract: '200MW solar power generation project to provide clean energy to 500,000 households in Quetta and surrounding areas.',
      primary_sector: 'Energy & Power',
      district: 'Quetta', city: 'Quetta',
      trl_level: 7, status: 'approved',
      total_cost: 25000000000, funding_gap: 10000000000,
      expected_roi: 13.5, payback_years: 8,
      direct_beneficiaries: 500000, jobs_created: 1200,
      organization_name: 'Pakistan Energy Department',
      user_id: owner[0].id, currency: 'PKR',
      sdg_goals: [7, 8, 13], tags: ['solar', 'energy', 'Quetta'],
    },
    {
      title: 'Gwadar Port Industrial Zone Development',
      abstract: 'Development of a 500-acre industrial zone adjacent to Gwadar Port to capitalize on CPEC trade corridor.',
      primary_sector: 'CPEC Infrastructure',
      district: 'Gwadar', city: 'Gwadar',
      trl_level: 5, status: 'approved',
      total_cost: 80000000000, funding_gap: 50000000000,
      expected_roi: 18.0, payback_years: 12,
      direct_beneficiaries: 200000, jobs_created: 5000,
      organization_name: 'Gwadar Development Authority',
      user_id: owner[0].id, currency: 'PKR',
      sdg_goals: [8, 9, 10, 17], tags: ['CPEC', 'Gwadar', 'industrial'],
    },
    {
      title: 'Pakistan Rural Health Initiative',
      abstract: 'Construction of 20 Basic Health Units across 10 underserved districts of Pakistan.',
      primary_sector: 'Health & Medical',
      district: 'Khuzdar', city: 'Khuzdar',
      trl_level: 6, status: 'under_review',
      total_cost: 5000000000, funding_gap: 2000000000,
      expected_roi: 6.0, payback_years: 15,
      direct_beneficiaries: 2000000, jobs_created: 400,
      organization_name: 'Pakistan Health Department',
      user_id: owner[0].id, currency: 'PKR',
      sdg_goals: [3, 10], tags: ['health', 'rural', 'BHU'],
    },
  ];

  for (const p of projects) {
    await Project.findOrCreate({ where: { title: p.title }, defaults: p });
  }

  console.log('✅ Seed data created successfully');
  console.log('Admin: admin@bcpp.gov.pk / Admin@123456');
  console.log('Investor: investor@hbl.com / Test@123456');
  console.log('Project Owner: energy@balochistan.gov.pk / Test@123456');
  process.exit(0);
};

seed().catch(e => { console.error(e); process.exit(1); });
