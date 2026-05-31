const { Op } = require('sequelize');
const { Project, User, Interest, SavedProject, ProjectUpdate } = require('../models');
const APIFeatures = require('../utils/apiFeatures');
const { sendEmail, emailTemplates } = require('../utils/email');
const { validationResult } = require('express-validator');

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
    const project = await Project.create({ ...req.body, user_id: req.user.id, status: 'under_review' });
    res.status(201).json({ success: true, data: project });
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
    await project.update(req.body);
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
    // Return formatted numbers: investment in billions, beneficiaries in millions
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
