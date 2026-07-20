const router = require('express').Router();
const crypto = require('crypto');
const pool = require('../db/pool');
const { authenticate, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { extractText } = require('../utils/extractText');
const { buildStorageKey, deleteObject, putObject } = require('../services/storage');

// GET all projects (public with filters)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      sector, province, district, priority, status = 'approved', search,
      page = 1, limit = 12, sort = 'created_at', order = 'DESC'
    } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    // Access scoping:
    //  - admin/superadmin: all projects (optional status filter)
    //  - provincial: only their own province, all statuses (optional status filter)
    //  - everyone else (incl. public): approved only
    const isAdmin = ['admin', 'superadmin'].includes(req.user?.role);
    const isProvincial = req.user?.role === 'provincial';

    if (isProvincial) {
      conditions.push(`p.province = $${idx++}`);
      params.push(req.user.province);
      if (req.query.status && req.query.status !== 'all') {
        conditions.push(`p.status = $${idx++}`);
        params.push(req.query.status);
      }
    } else if (isAdmin) {
      if (status !== 'all') {
        conditions.push(`p.status = $${idx++}`);
        params.push(status);
      }
    } else {
      conditions.push(`p.status = $${idx++}`);
      params.push('approved');
    }

    if (sector) { conditions.push(`p.primary_sector = $${idx++}`); params.push(sector); }
    if (province) { conditions.push(`p.province = $${idx++}`); params.push(province); }
    if (district) { conditions.push(`p.district = $${idx++}`); params.push(district); }
    if (priority) { conditions.push(`p.priority_level = $${idx++}`); params.push(priority); }
    if (search) {
      conditions.push(`(p.title ILIKE $${idx} OR p.abstract ILIKE $${idx} OR p.organization_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSorts = ['created_at', 'title', 'total_cost', 'expected_roi'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const [projectsResult, countResult] = await Promise.all([
      pool.query(`
        SELECT p.id, p.project_code, p.title, p.abstract, p.primary_sector, p.province, p.district, p.city,
               p.status, p.trl_level, p.currency, p.total_cost, p.funding_gap,
               p.expected_roi, p.payback_years, p.direct_beneficiaries, p.jobs_created,
               p.organization_name, p.tags, p.progress_percent, p.infographic_url,
               p.latitude, p.longitude,
               p.created_at, p.risk_level, p.priority_level,
               u.first_name || ' ' || u.last_name AS owner_name
        FROM projects p
        LEFT JOIN users u ON p.user_id = u.id
        ${where}
        ORDER BY p.${sortCol} ${sortOrder}
        LIMIT $${idx} OFFSET $${idx + 1}
      `, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM projects p ${where}`, params)
    ]);

    res.json({
      projects: projectsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET the current user's own submitted projects.
// Must be declared BEFORE '/:id' or '/my' is captured as an :id and fails the UUID cast.
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, status, primary_sector, province, district, total_cost, created_at
       FROM projects WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch your projects' });
  }
});

// GET the current user's saved projects.
router.get('/saved', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.project_code, p.title, p.abstract, p.primary_sector, p.province, p.district, p.city,
             p.status, p.trl_level, p.currency, p.total_cost, p.funding_gap,
             p.expected_roi, p.payback_years, p.direct_beneficiaries, p.jobs_created,
             p.organization_name, p.tags, p.progress_percent, p.infographic_url,
             p.latitude, p.longitude,
             p.created_at, p.risk_level, p.priority_level,
             sp.created_at AS saved_at,
             u.first_name || ' ' || u.last_name AS owner_name
      FROM saved_projects sp
      JOIN projects p ON sp.project_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE sp.user_id = $1
      ORDER BY sp.created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch saved projects' });
  }
});

// GET single project
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, u.first_name || ' ' || u.last_name AS owner_name, u.email AS owner_email
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const project = result.rows[0];

    // Provincial users may only open non-approved projects within their own province.
    // (Approved projects remain publicly viewable for everyone.)
    if (req.user?.role === 'provincial' && project.status !== 'approved' && project.province !== req.user.province) {
      return res.status(403).json({ error: 'Forbidden: project is outside your province' });
    }

    // Fetch related data
    const [sdgs, team, docs, videos, updates, shareholders, futurePlans, linkedProjects, phases, fundingSources, feasibilityLinks, projectDistricts] = await Promise.all([
      pool.query('SELECT sdg_number FROM project_sdgs WHERE project_id = $1', [id]),
      pool.query('SELECT * FROM project_team WHERE project_id = $1 ORDER BY is_lead DESC', [id]),
      pool.query('SELECT * FROM project_documents WHERE project_id = $1', [id]),
      pool.query('SELECT * FROM project_videos WHERE project_id = $1', [id]),
      pool.query('SELECT pu.*, u.first_name || \' \' || u.last_name AS author_name FROM project_updates pu LEFT JOIN users u ON pu.user_id = u.id WHERE pu.project_id = $1 ORDER BY pu.created_at DESC', [id]),
      pool.query('SELECT * FROM project_shareholders WHERE project_id = $1', [id]),
      pool.query('SELECT * FROM project_future_plans WHERE project_id = $1 ORDER BY created_at', [id]),
      pool.query(`
        SELECT p2.id, p2.title, p2.primary_sector, p2.status, p2.district
        FROM project_links pl
        JOIN projects p2 ON pl.linked_project_id = p2.id
        WHERE pl.project_id = $1
      `, [id]),
      pool.query('SELECT * FROM project_phases WHERE project_id = $1 ORDER BY phase_order', [id]),
      pool.query('SELECT * FROM project_funding_sources WHERE project_id = $1 ORDER BY created_at', [id]),
      pool.query('SELECT * FROM project_feasibility_links WHERE project_id = $1 ORDER BY created_at', [id]),
      pool.query(`SELECT d.id, d.province, d.name FROM project_districts pd
                  JOIN districts d ON d.id = pd.district_id WHERE pd.project_id = $1 ORDER BY d.name`, [id])
    ]);

    const canManageDocuments = ['admin', 'superadmin'].includes(req.user?.role) ||
      project.user_id === req.user?.id ||
      (req.user?.role === 'provincial' && project.province === req.user.province);
    const visibleDocuments = docs.rows.filter((document) => canManageDocuments ||
      (document.visibility === 'public' && project.status === 'approved') ||
      (document.visibility === 'registered' && req.user));

    // Check if user has saved this project
    let isSaved = false;
    let myInterest = null;
    if (req.user) {
      const saved = await pool.query('SELECT id FROM saved_projects WHERE user_id = $1 AND project_id = $2', [req.user.id, id]);
      isSaved = saved.rows.length > 0;
      const interest = await pool.query(
        'SELECT id, status, owner_response, owner_responded_at, created_at FROM interests WHERE user_id = $1 AND project_id = $2',
        [req.user.id, id]
      );
      myInterest = interest.rows[0] || null;
    }

    res.json({
      ...project,
      sdg_goals: sdgs.rows.map(r => r.sdg_number),
      team: team.rows,
      documents: visibleDocuments,
      videos: videos.rows,
      updates: updates.rows,
      shareholders: shareholders.rows,
      future_plans: futurePlans.rows,
      linked_projects: linkedProjects.rows,
      phases: phases.rows,
      funding_sources: fundingSources.rows,
      feasibility_links: feasibilityLinks.rows,
      districts: projectDistricts.rows,
      is_saved: isSaved,
      has_expressed_interest: Boolean(myInterest),
      my_interest: myInterest
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// CREATE project
router.post('/', authenticate, async (req, res) => {
  const canSubmitProject = ['admin', 'superadmin', 'project_owner', 'government', 'ngo', 'provincial'].includes(req.user.role);
  if (!canSubmitProject) {
    return res.status(403).json({ error: 'Investor accounts can express interest in projects but cannot submit projects.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      title, abstract, description, primary_sector, sub_sectors,
      sdg_goals, trl_level, risk_level, priority_level,
      duration_months, start_date, expected_completion,
      province, district, city, address,
      currency, total_cost, total_project_cost, research_fund, equity_fund,
      debt_loan, grant_amount, grant, funding_gap, min_investment, minimum_investment, expected_roi, payback_years,
      direct_beneficiaries, indirect_beneficiaries, jobs_created,
      carbon_market_relevant, carbon_standard, carbon_methodology, carbon_credit_status,
      feasibility_status, feasibility_study_url, feasibility_notes, land_acquired,
      wef_nexus, line_ministry, provincial_contacts, partners,
      mitigation_value, mitigation_unit, mitigation_basis,
      secondary_sector, wef_pillars, stage, carbon_credit_methodology, feasibility_type,
      approval_loi_los, approval_departmental, approval_mocc_notification, approvals_answered_at,
      climate_finance_available, climate_finance_amount, carbon_finance_option, carbon_finance_notes,
      estimated_co2_reduction, phases, funding_sources, feasibility_links, districts,
      organization_name, organization_type, organization_website,
      tags, shareholders, team, videos, future_plans, linked_projects
    } = req.body;

    const normalizedGrantAmount = grant_amount ?? grant ?? null;
    const normalizedMinInvestment = min_investment ?? minimum_investment ?? null;
    const normalizedTotalCost = total_cost ?? total_project_cost ?? null;
    const n = (v) => (v === '' || v === undefined ? null : v);

    // Provincial users can only file under their own province; ignore any body value.
    const effectiveProvince = req.user.role === 'provincial' ? req.user.province : province;

    // Normalize CO2 mitigation to tonnes CO2e server-side (don't trust client maths).
    const CO2_FACTORS = { kgCO2e: 0.001, tCO2e: 1, ktCO2e: 1000, MtCO2e: 1000000 };
    const mitVal = (mitigation_value === '' || mitigation_value === undefined || mitigation_value === null) ? null : Number(mitigation_value);
    const mitTco2e = (mitVal !== null && !Number.isNaN(mitVal)) ? mitVal * (CO2_FACTORS[mitigation_unit] ?? 1) : null;

    const result = await client.query(`
      INSERT INTO projects (
  title, abstract, description, primary_sector, sub_sectors,
  trl_level, risk_level, priority_level, status,
  duration_months, start_date, end_date,
  district, city, address,
  currency, total_cost, research_fund, equity_fund,
  debt_loan, grant_amount, funding_gap, minimum_investment, expected_roi, payback_years,
  direct_beneficiaries, indirect_beneficiaries, jobs_created,
  organization_name, organization_type, organization_website,
  tags, user_id, province,
  carbon_market_relevant, carbon_standard, carbon_methodology, carbon_credit_status,
  feasibility_status, feasibility_study_url, feasibility_notes, land_acquired,
  wef_nexus, line_ministry, provincial_contacts, partners,
  mitigation_value, mitigation_unit, mitigation_basis, mitigation_tco2e
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'under_review',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49)
RETURNING *
    `, [
  title, abstract, description, primary_sector, sub_sectors,
  n(trl_level), risk_level, priority_level,
  n(duration_months), n(start_date), n(expected_completion),
  district, city, address,
  currency, n(normalizedTotalCost), n(research_fund), n(equity_fund),
  n(debt_loan), n(normalizedGrantAmount), n(funding_gap), n(normalizedMinInvestment), n(expected_roi), n(payback_years),
  n(direct_beneficiaries), n(indirect_beneficiaries), n(jobs_created),
  organization_name, organization_type, organization_website,
  tags, req.user.id, n(effectiveProvince),
  carbon_market_relevant || false, n(carbon_standard), n(carbon_methodology), n(carbon_credit_status),
  n(feasibility_status), n(feasibility_study_url), n(feasibility_notes), land_acquired || false,
  wef_nexus && wef_nexus.length ? wef_nexus : null, n(line_ministry),
  JSON.stringify(provincial_contacts || []), JSON.stringify(partners || []),
  mitVal, n(mitigation_unit), n(mitigation_basis), mitTco2e
]);

    const project = result.rows[0];
    const projectId = project.id;

    // Phase II scalar fields are updated separately to keep legacy imports and
    // the existing create statement compatible with the pre-Phase-II schema.
    const phase2Values = {
      secondary_sector, wef_pillars, stage, carbon_credit_methodology, feasibility_type,
      approval_loi_los, approval_departmental, approval_mocc_notification, approvals_answered_at,
      climate_finance_available, climate_finance_amount, carbon_finance_option, carbon_finance_notes,
      estimated_co2_reduction,
    };
    const phase2Updates = Object.entries(phase2Values).filter(([, value]) => value !== undefined);
    if (phase2Updates.length) {
      const assignments = phase2Updates.map(([field], index) => `${field} = $${index + 1}`);
      await client.query(`UPDATE projects SET ${assignments.join(', ')} WHERE id = $${phase2Updates.length + 1}`,
        [...phase2Updates.map(([, value]) => n(value)), projectId]);
    }

    if (Array.isArray(districts) && districts.length) {
      const districtIds = [...new Set(districts.map(Number).filter(Number.isInteger))];
      const districtRows = await client.query(
        'SELECT id FROM districts WHERE id = ANY($1::int[]) AND province = $2', [districtIds, effectiveProvince]
      );
      if (districtRows.rowCount !== districtIds.length) throw new Error('Each selected district must belong to the project province.');
      for (const districtId of districtIds) {
        await client.query('INSERT INTO project_districts (project_id, district_id) VALUES ($1, $2)', [projectId, districtId]);
      }
    }

    if (Array.isArray(phases)) {
      for (const [index, phase] of phases.entries()) {
        if (!phase.phase_name?.trim()) continue;
        await client.query(`INSERT INTO project_phases
          (project_id, phase_name, phase_order, start_date, end_date, duration_months, status, estimated_cost)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [projectId, phase.phase_name.trim(), index + 1, n(phase.start_date), n(phase.end_date), n(phase.duration_months), n(phase.status), n(phase.estimated_cost)]);
      }
    }

    if (Array.isArray(funding_sources)) {
      for (const source of funding_sources) {
        if (!source.source_type) continue;
        await client.query(`INSERT INTO project_funding_sources
          (project_id, source_type, provider_name, instrument, amount, currency, status)
          VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [projectId, source.source_type, n(source.provider_name), n(source.instrument), n(source.amount), source.currency || effectiveCurrency || 'PKR', source.status || 'pipeline']);
      }
    }

    if (Array.isArray(feasibility_links)) {
      for (const link of feasibility_links) {
        if (!link.title?.trim() || !link.url?.trim()) continue;
        await client.query('INSERT INTO project_feasibility_links (project_id, title, url) VALUES ($1,$2,$3)',
          [projectId, link.title.trim(), link.url.trim()]);
      }
    }

    // Insert SDGs
    if (sdg_goals?.length) {
      for (const sdg of sdg_goals) {
        await client.query('INSERT INTO project_sdgs (project_id, sdg_number) VALUES ($1,$2)', [projectId, sdg]);
      }
    }

    // Insert team
    if (team?.length) {
      for (const member of team) {
        await client.query(`
          INSERT INTO project_team (project_id, team_name, is_lead, full_name, designation, email, phone, linkedin)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [projectId, n(member.team_name), member.is_lead || false, member.full_name, member.designation, member.email, member.phone, member.linkedin]);
      }
    }

    // Insert shareholders
    if (shareholders?.length) {
      for (const sh of shareholders) {
        await client.query(`
          INSERT INTO project_shareholders (project_id, name, type, share_percent, amount, contact_email, website, status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [projectId, sh.name, sh.type, sh.share_percent, sh.amount, sh.contact_email, sh.website, sh.status || 'discussion']);
      }
    }

    // Insert videos
    if (videos?.length) {
      for (const v of videos) {
        await client.query('INSERT INTO project_videos (project_id, title, url, duration) VALUES ($1,$2,$3,$4)', [projectId, v.title, v.url, v.duration]);
      }
    }

    // Insert future plans
    if (future_plans?.length) {
      for (const fp of future_plans) {
        await client.query(`
          INSERT INTO project_future_plans (project_id, phase_name, title, timeline, description, estimated_cost)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [projectId, fp.phase_name, fp.title, fp.timeline, fp.description, fp.estimated_cost]);
      }
    }

    await client.query('COMMIT');

    // Notify admins
    const admins = await pool.query("SELECT id FROM users WHERE role IN ('admin','superadmin')");
    for (const admin of admins.rows) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1,$2,$3,'info',$4)
      `, [admin.id, 'New Project Submitted', `"${title}" has been submitted for review.`, '/admin/projects?status=under_review&sort_by=created_at&sort_dir=asc']);
    }

    res.status(201).json(project);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  } finally {
    client.release();
  }
});

// UPDATE project
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (!project.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const proj = project.rows[0];
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isProvincial = req.user.role === 'provincial';
    if (isProvincial) {
      // Provincial users may edit any project within their own province.
      if (proj.province !== req.user.province) {
        return res.status(403).json({ error: 'Forbidden: project is outside your province' });
      }
    } else if (!isAdmin && proj.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Note: province is intentionally NOT editable here, so a provincial user
    // cannot move a project into another region.
    const allowedFields = [
      'title', 'abstract', 'description', 'primary_sector', 'trl_level',
      'district', 'city', 'currency', 'total_cost', 'funding_gap',
      'expected_roi', 'organization_name', 'tags', 'risk_level', 'priority_level',
      'secondary_sector', 'wef_pillars', 'stage', 'carbon_credit_methodology',
      'feasibility_type', 'approval_loi_los', 'approval_departmental',
      'approval_mocc_notification', 'approvals_answered_at', 'climate_finance_available',
      'climate_finance_amount', 'carbon_finance_option', 'carbon_finance_notes',
      'estimated_co2_reduction'
    ];

    const updates = [];
    const values = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    // Phase II child collections are intentionally small; replace them as a
    // unit so edit submissions cannot leave stale phase/funding/link rows.
    if (Array.isArray(req.body.phases)) {
      await pool.query('DELETE FROM project_phases WHERE project_id = $1', [id]);
      for (const [order, phase] of req.body.phases.entries()) {
        if (!phase.phase_name?.trim()) continue;
        await pool.query(`INSERT INTO project_phases (project_id, phase_name, phase_order, start_date, end_date, duration_months, status, estimated_cost)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, phase.phase_name.trim(), order + 1, phase.start_date || null, phase.end_date || null, phase.duration_months || null, phase.status || null, phase.estimated_cost || null]);
      }
    }
    if (Array.isArray(req.body.funding_sources)) {
      await pool.query('DELETE FROM project_funding_sources WHERE project_id = $1', [id]);
      for (const source of req.body.funding_sources) {
        if (!source.source_type) continue;
        await pool.query(`INSERT INTO project_funding_sources (project_id, source_type, provider_name, instrument, amount, currency, status)
          VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, source.source_type, source.provider_name || null, source.instrument || null, source.amount || null, source.currency || result.rows[0].currency || 'PKR', source.status || 'pipeline']);
      }
    }
    if (Array.isArray(req.body.feasibility_links)) {
      await pool.query('DELETE FROM project_feasibility_links WHERE project_id = $1', [id]);
      for (const link of req.body.feasibility_links) {
        if (link.title?.trim() && link.url?.trim()) await pool.query('INSERT INTO project_feasibility_links (project_id, title, url) VALUES ($1,$2,$3)', [id, link.title.trim(), link.url.trim()]);
      }
    }
    if (Array.isArray(req.body.districts)) {
      const districtIds = [...new Set(req.body.districts.map(Number).filter(Number.isInteger))];
      const valid = await pool.query('SELECT id FROM districts WHERE id = ANY($1::int[]) AND province = $2', [districtIds, proj.province]);
      if (valid.rowCount !== districtIds.length) return res.status(400).json({ error: 'Each selected district must belong to the project province.' });
      await pool.query('DELETE FROM project_districts WHERE project_id = $1', [id]);
      for (const districtId of districtIds) await pool.query('INSERT INTO project_districts (project_id, district_id) VALUES ($1,$2)', [id, districtId]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE project (owner or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT user_id, province FROM projects WHERE id = $1', [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const proj = result.rows[0];
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isProvincial = req.user.role === 'provincial';
    if (isProvincial) {
      if (proj.province !== req.user.province) return res.status(403).json({ error: 'Forbidden: project is outside your province' });
    } else if (!isAdmin && proj.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST project update (owner or admin)
router.post('/:id/updates', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { update_type, title, content } = req.body;

    const project = await pool.query('SELECT user_id, province FROM projects WHERE id = $1', [id]);
    if (!project.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const isOwner = project.rows[0].user_id === req.user.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isProvincial = req.user.role === 'provincial';
    if (isProvincial) {
      if (project.rows[0].province !== req.user.province) {
        return res.status(403).json({ error: 'Forbidden: project is outside your province' });
      }
    } else if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(`
      INSERT INTO project_updates (project_id, user_id, update_type, title, content)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [id, req.user.id, update_type || 'general', title, content]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to post update' });
  }
});

// Upload one or more documents. `file` remains supported for legacy clients;
// new clients submit one or more files under `files`.
router.post('/:id/documents', authenticate, upload.fields([{ name: 'file', maxCount: 20 }, { name: 'files', maxCount: 20 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const files = [...(req.files?.file || []), ...(req.files?.files || [])];
    const category = req.body.category || req.body.document_type || 'other';
    const visibility = req.body.visibility || 'registered';
    const title = req.body.title || null;
    const validVisibility = ['public', 'registered', 'private'];

    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });
    if (!validVisibility.includes(visibility)) return res.status(400).json({ error: 'Invalid document visibility' });

    const projectResult = await pool.query('SELECT user_id, province FROM projects WHERE id = $1', [id]);
    const project = projectResult.rows[0];
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isOwner = project.user_id === req.user.id;
    const isProvincialOwner = req.user.role === 'provincial' && project.province === req.user.province;
    if (!isAdmin && !isOwner && !isProvincialOwner) return res.status(403).json({ error: 'Forbidden' });

    const documents = [];
    for (const file of files) {
      const documentId = crypto.randomUUID();
      const key = buildStorageKey(id, file.originalname);
      let stored;
      try {
        stored = await putObject({ key, buffer: file.buffer, mimeType: file.mimetype });
        const extractedText = await extractText(file);
        const fileUrl = stored.fileUrl || `/api/documents/${documentId}/download`;
        const result = await pool.query(`
          INSERT INTO project_documents
            (id, project_id, document_type, file_name, file_url, file_size, uploaded_by, title, category, visibility, storage_key, mime_type, extracted_text)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          RETURNING *
        `, [documentId, id, category, file.originalname, fileUrl, file.size, req.user.id, title, category, visibility, stored.storageKey, file.mimetype, extractedText]);
        documents.push(result.rows[0]);
      } catch (error) {
        if (stored?.storageKey) await deleteObject(stored.storageKey).catch(() => {});
        throw error;
      }
    }

    res.status(201).json({ documents });
  } catch (err) {
    console.error('Failed to upload document:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Save / unsave project
router.post('/:id/save', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM saved_projects WHERE user_id = $1 AND project_id = $2', [req.user.id, id]);

    if (existing.rows[0]) {
      await pool.query('DELETE FROM saved_projects WHERE user_id = $1 AND project_id = $2', [req.user.id, id]);
      res.json({ saved: false });
    } else {
      await pool.query('INSERT INTO saved_projects (user_id, project_id) VALUES ($1,$2)', [req.user.id, id]);
      res.json({ saved: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle save' });
  }
});

// Get platform statistics (public)
router.get('/stats/public', async (req, res) => {
  try {
    const [projects, funding, beneficiaries, investors, sectorCounts, provinceCounts] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM projects WHERE status = 'approved'"),
      pool.query("SELECT COALESCE(SUM(total_cost),0) AS total FROM projects WHERE status = 'approved'"),
      pool.query("SELECT COALESCE(SUM(direct_beneficiaries),0) AS total FROM projects WHERE status = 'approved'"),
      pool.query("SELECT COUNT(DISTINCT user_id) FROM interests"),
      pool.query(`
        SELECT COALESCE(primary_sector, 'Unspecified') AS sector, COUNT(*) AS count
        FROM projects
        WHERE status = 'approved'
        GROUP BY COALESCE(primary_sector, 'Unspecified')
        ORDER BY count DESC, sector ASC
        LIMIT 8
      `),
      pool.query(`
        SELECT COALESCE(province, 'Unspecified') AS province, COUNT(*) AS count
        FROM projects
        WHERE status = 'approved'
        GROUP BY COALESCE(province, 'Unspecified')
        ORDER BY count DESC, province ASC
        LIMIT 8
      `)
    ]);

    res.json({
      total_projects: parseInt(projects.rows[0].count),
      total_funding: parseInt(funding.rows[0].total),
      total_beneficiaries: parseInt(beneficiaries.rows[0].total),
      active_investors: parseInt(investors.rows[0].count),
      projects_by_sector: sectorCounts.rows.map((row) => ({
        sector: row.sector,
        count: parseInt(row.count)
      })),
      projects_by_province: provinceCounts.rows.map((row) => ({
        province: row.province,
        count: parseInt(row.count)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
