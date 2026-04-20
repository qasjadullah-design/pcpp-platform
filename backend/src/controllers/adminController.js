const { Project, User, Interest, Notification } = require('../models');
const { sendEmail, emailTemplates } = require('../utils/email');
const { sequelize } = require('../config/database');

// @PUT /api/admin/projects/:id/review
exports.reviewProject = async (req, res, next) => {
  try {
    const { action, feedback } = req.body; // action: approve | reject | request_changes
    const project = await Project.findByPk(req.params.id, { include: [{ model: User, as: 'owner' }] });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const statusMap = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested' };
    await project.update({ status: statusMap[action], admin_feedback: feedback, reviewed_by: req.user.id, reviewed_at: new Date() });
    await Notification.create({
      user_id: project.user_id,
      title: `Project ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Changes Requested'}`,
      message: feedback || `Your project "${project.title}" has been ${statusMap[action]}.`,
      type: action === 'approve' ? 'approval' : action === 'reject' ? 'rejection' : 'changes_requested',
      reference_id: project.id, reference_type: 'project',
    });
    try {
      if (action === 'approve') await sendEmail({ to: project.owner.email, subject: 'Project Approved!', html: emailTemplates.projectApproved(project.title) });
      else await sendEmail({ to: project.owner.email, subject: 'Project Review Update', html: emailTemplates.projectRejected(project.title, feedback) });
    } catch(e) {}
    res.status(200).json({ success: true, data: project });
  } catch (error) { next(error); }
};

// @PUT /api/admin/projects/:id/status
exports.changeProjectStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const project = await Project.findByPk(req.params.id, { include: [{ model: User, as: 'owner' }] });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const ALLOWED_TRANSITIONS = {
      under_review: ['approved'],
      approved: ['archived'],
    };
    const allowed = ALLOWED_TRANSITIONS[project.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Cannot change status from "${project.status}" to "${status}"` });
    }

    await project.update({ status, reviewed_by: req.user.id, reviewed_at: new Date() });

    const titleMap = { approved: 'Project Approved', archived: 'Project Archived' };
    await Notification.create({
      user_id: project.user_id,
      title: titleMap[status] || `Project status changed to ${status}`,
      message: `Your project "${project.title}" has been ${status}.`,
      type: status === 'approved' ? 'success' : 'info',
      reference_id: project.id, reference_type: 'project',
    });

    try {
      if (status === 'approved') await sendEmail({ to: project.owner.email, subject: 'Project Approved!', html: emailTemplates.projectApproved(project.title) });
    } catch(e) {}

    res.status(200).json({ success: true, data: project });
  } catch (error) { next(error); }
};

// @GET /api/admin/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const [sectorStats] = await sequelize.query(`SELECT primary_sector, COUNT(*) as count, SUM(total_cost) as total FROM projects WHERE status != 'draft' GROUP BY primary_sector ORDER BY count DESC`);
    const [statusStats] = await sequelize.query(`SELECT status, COUNT(*) as count FROM projects GROUP BY status`);
    const [districtStats] = await sequelize.query(`SELECT district, COUNT(*) as count, SUM(total_cost) as total FROM projects WHERE status != 'draft' AND district IS NOT NULL GROUP BY district ORDER BY count DESC LIMIT 10`);
    const [trlStats] = await sequelize.query(`SELECT trl_level, COUNT(*) as count FROM projects WHERE status != 'draft' GROUP BY trl_level ORDER BY trl_level`);
    const [investmentStats] = await sequelize.query(`SELECT SUM(total_cost) as total_investment, SUM(funding_gap) as funding_gap, SUM(direct_beneficiaries) as beneficiaries, SUM(jobs_created) as jobs FROM projects WHERE status NOT IN ('draft','rejected')`);
    const [topInvestors] = await sequelize.query(`SELECT u.id, u.first_name, u.last_name, u.organization, COUNT(i.id) as interests, SUM(i.investment_range_max) as max_investment FROM interests i JOIN users u ON i.user_id = u.id GROUP BY u.id ORDER BY interests DESC LIMIT 10`);
    const userCount = await User.count();
    const pendingReview = await Project.count({ where: { status: 'under_review' } });
    res.status(200).json({
      success: true,
      data: { sector_stats: sectorStats, status_stats: statusStats, district_stats: districtStats, trl_stats: trlStats, investment_stats: investmentStats[0], top_investors: topInvestors, user_count: userCount, pending_review: pendingReview },
    });
  } catch (error) { next(error); }
};

// @GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { organization: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({ where, limit: parseInt(limit), offset, order: [['created_at', 'DESC']] });
    res.status(200).json({ success: true, count, total_pages: Math.ceil(count / limit), page: parseInt(page), data: rows });
  } catch (error) { next(error); }
};

// @PUT /api/admin/users/:id/status
exports.updateUserStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.update({ status: req.body.status });
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};
