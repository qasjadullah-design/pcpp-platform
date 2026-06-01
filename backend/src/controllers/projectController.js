const { Op } = require('sequelize');
const { Project, User, Interest, SavedProject, ProjectUpdate } = require('../models');
const APIFeatures = require('../utils/apiFeatures');
const { sendEmail, emailTemplates } = require('../utils/email');

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const toStringOrNull = (value, maxLength = null) => {
  if (isBlank(value)) return null;
  const text = String(value).trim();
  return maxLength ? text.slice(0, maxLength) : text;
};
const toRequiredString = (value, fieldName, maxLength = null) => {
  const text = toStringOrNull(value, maxLength);
  if (!text) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }
  return text;
};
const toNumberOrNull = (value) => {
  if (isBlank(value)) return null;
  const number = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(number)) {
    const error = new Error(`Invalid number value: ${value}`);
    error.statusCode = 400;
    throw error;
  }
  return number;
};
const toIntegerOrNull = (value) => {
  const number = toNumberOrNull(value);
  return number === null ? null : Math.trunc(number);
};
const toDateOrNull = (value) => {
  if (isBlank(value)) return null;
  return value;
};
const toArrayOrNull = (value, mapFn = (x) => x) => {
  if (value === undefined || value === null) return null;
  const array = Array.isArray(value) ? value : String(value).split(',');
  const cleaned = array.map(v => mapFn(v)).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  return cleaned.length ? cleaned : null;
};
const toJsonOrNull = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object') {
    const hasValue = Object.values(value).some(v => !isBlank(v));
    return hasValue ? value : null;
  }
  return value;
};

const sanitizeProjectPayload = (body, user, mode = 'create') => {
  const requestedStatus = body.status;
  const status = requestedStatus === 'draft' ? 'draft' : 'under_review';

  const title = toRequiredString(body.title, 'Project title', 300);
  const abstract = toStringOrNull(body.abstract) || title;
  const primarySector = toStringOrNull(body.primary_sector, 100) || 'Other';

  const payload = {
    title,
    abstract,
    description: toStringOrNull(body.description),
    province: toStringOrNull(body.province, 100),
    primary_sector: primarySector,
    sub_sectors: toArrayOrNull(body.sub_sectors, v => String(v).trim()),
    sdg_goals: toArrayOrNull(body.sdg_goals, v => {
      const number = Number(v);
      return Number.isInteger(number) ? number : null;
    }),
    trl_level: toIntegerOrNull(body.trl_level),
    status,
    priority_level: ['low', 'medium', 'high', 'critical'].includes(body.priority_level) ? body.priority_level : 'medium',
    risk_level: ['low', 'medium', 'high'].includes(body.risk_level) ? body.risk_level : 'medium',
    district: toStringOrNull(body.district, 100),
    city: toStringOrNull(body.city, 100),
    address: toStringOrNull(body.address),
    latitude: toNumberOrNull(body.latitude),
    longitude: toNumberOrNull(body.longitude),
    start_date: toDateOrNull(body.start_date),
    end_date: toDateOrNull(body.end_date || body.expected_completion),
    duration_months: toIntegerOrNull(body.duration_months),
    currency: toStringOrNull(body.currency, 10) || 'PKR',
    total_cost: toNumberOrNull(body.total_cost),
    research_fund: toNumberOrNull(body.research_fund),
    equity_fund: toNumberOrNull(body.equity_fund),
    debt_loan: toNumberOrNull(body.debt_loan),
    grant_amount: toNumberOrNull(body.grant_amount),
    funding_gap: toNumberOrNull(body.funding_gap),
    minimum_investment: toNumberOrNull(body.minimum_investment || body.min_investment),
    expected_roi: toNumberOrNull(body.expected_roi),
    payback_years: toIntegerOrNull(body.payback_years),
    direct_beneficiaries: toIntegerOrNull(body.direct_beneficiaries),
    indirect_beneficiaries: toIntegerOrNull(body.indirect_beneficiaries),
    jobs_created: toIntegerOrNull(body.jobs_created),
    impact_metrics: toJsonOrNull(body.impact_metrics),
    organization_name: toStringOrNull(body.organization_name, 200),
    organization_type: toStringOrNull(body.organization_type, 100),
    organization_website: toStringOrNull(body.organization_website, 500),
    project_lead: toJsonOrNull(body.project_lead),
    team_members: toJsonOrNull(body.team_members),
    shareholders: toJsonOrNull(body.shareholders),
    documents: toJsonOrNull(body.documents),
    videos: toJsonOrNull(body.videos),
    future_plans: toJsonOrNull(body.future_plans),
    tags: toArrayOrNull(body.tags, v => String(v).trim()),
    infographic_url: toStringOrNull(body.infographic_url, 500),
  };

  if (mode === 'create') {
    payload.user_id = user.id;
  }

  return payload;
};

// @GET /api/projects - Public
exports.getProjects = async (req, res, next) => {
  try {
    const where = { ...APIFeatures.buildWhereClause(req.query) };
    if ((!req.user || req.user.role !== 'admin') && !where.status) {
      where.status = { [Op.in]: ['approved','under_implementation','completed','archived'] };
    }
    const { limit, offset, page } = APIFeatures.getPagination(req.query);
    const { count, rows } = await Project.findAndCountAll({
      where, limit, offset,
      order: APIFeatures.getOrder(req.query),
      include: [{ model: User, as: 'owner', attributes: ['id','first_name','last_name','organization'] }],
    });
    res.status(200).json({
      success: true,
      count, page,
      total_pages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (error) { next(error); }
};

// @GET /api/projects/:id - Public
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id','first_name','last_name','email','phone','organization'] },
        { model: ProjectUpdate, as: 'updates', order: [['created_at', 'DESC']] },
      ],
    });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    await project.increment('views_count');
    res.status(200).json({ success: true, data: project });
  } catch (error) { next(error); }
};

// @POST /api/projects - Auth required
exports.createProject = async (req, res, next) => {
  try {
    const payload = sanitizeProjectPayload(req.body, req.user, 'create');
    const project = await Project.create(payload);
    const message = project.status === 'draft'
      ? 'Project saved as draft'
      : 'Project submitted for admin review';
    res.status(201).json({ success: true, message, data: project });
  } catch (error) { next(error); }
};

// @PUT /api/projects/:id - Auth required
exports.updateProject = async (req, res, next) => {
  try {
    let project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const payload = sanitizeProjectPayload(req.body, req.user, 'update');
    await project.update(payload);
    res.status(200).json({ success: true, data: project });
  } catch (error) { next(error); }
};

// @DELETE /api/projects/:id - Auth required
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await project.destroy();
    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (error) { next(error); }
};

// @POST /api/projects/:id/submit - Submit for review
exports.submitProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    await project.update({ status: 'under_review' });
    res.status(200).json({ success: true, data: project });
  } catch (error) { next(error); }
};

// @GET /api/projects/my - Auth required
exports.getMyProjects = async (req, res, next) => {
  try {
    const projects = await Project.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      include: [{ model: Interest, as: 'interests', attributes: ['id','status'] }],
    });
    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (error) { next(error); }
};

// @POST /api/projects/:id/save - Toggle save
exports.toggleSave = async (req, res, next) => {
  try {
    const existing = await SavedProject.findOne({ where: { user_id: req.user.id, project_id: req.params.id } });
    if (existing) {
      await existing.destroy();
      return res.status(200).json({ success: true, saved: false });
    }
    await SavedProject.create({ user_id: req.user.id, project_id: req.params.id });
    res.status(200).json({ success: true, saved: true });
  } catch (error) { next(error); }
};

// @GET /api/projects/saved - Auth required
exports.getSavedProjects = async (req, res, next) => {
  try {
    const saved = await SavedProject.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Project, as: 'project', include: [{ model: User, as: 'owner', attributes: ['id','first_name','last_name'] }] }],
    });
    res.status(200).json({ success: true, data: saved.map(s => s.project) });
  } catch (error) { next(error); }
};

// @POST /api/projects/:id/updates
exports.postUpdate = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const update = await ProjectUpdate.create({ ...req.body, project_id: req.params.id, user_id: req.user.id });
    res.status(201).json({ success: true, data: update });
  } catch (error) { next(error); }
};

// @GET /api/projects/stats - Public
exports.getStats = async (req, res, next) => {
  try {
    const { sequelize } = require('../config/database');
    const [results] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(total_cost) as total_investment,
        SUM(direct_beneficiaries + COALESCE(indirect_beneficiaries,0)) as total_beneficiaries,
        COUNT(DISTINCT user_id) as total_users
      FROM projects WHERE status IN ('approved','under_implementation','completed','archived')
    `);
    
    const data = results[0];
    const formatted = {
      total_projects: parseInt(data.total_projects) || 0,
      total_investment: data.total_investment 
        ? parseFloat((parseFloat(data.total_investment) / 1_000_000_000).toFixed(1))
        : 0,
      total_beneficiaries: data.total_beneficiaries
        ? parseFloat((parseFloat(data.total_beneficiaries) / 1_000_000).toFixed(1))
        : 0,
      total_users: parseInt(data.total_users) || 0
    };
    
    res.status(200).json({ success: true, data: formatted });
  } catch (error) { next(error); }
};

// @GET /api/projects/stats/by-province - Public
exports.getStatsByProvince = async (req, res, next) => {
  try {
    const { sequelize } = require('../config/database');

    const [results] = await sequelize.query(`
      SELECT
        province,
        status,
        COUNT(*)::int AS project_count,
        COALESCE(SUM(total_cost), 0)::numeric AS total_investment
      FROM public.projects
      WHERE province IS NOT NULL
        AND status IN ('approved','under_implementation','completed','archived')
      GROUP BY province, status
      ORDER BY province, status;
    `);

    const byProvince = {};
    for (const row of results) {
      if (!byProvince[row.province]) {
        byProvince[row.province] = { total_projects: 0, total_investment: 0, by_status: {} };
      }
      byProvince[row.province].by_status[row.status] = row.project_count;
      byProvince[row.province].total_projects += row.project_count;
      byProvince[row.province].total_investment += parseFloat(row.total_investment) || 0;
    }

    res.status(200).json({ success: true, data: byProvince });
  } catch (error) { next(error); }
};
