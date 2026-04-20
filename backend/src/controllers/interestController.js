const { Interest, Project, User, Notification } = require('../models');
const { sendEmail, emailTemplates } = require('../utils/email');

// @POST /api/interests/:projectId
exports.expressInterest = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.projectId, { include: [{ model: User, as: 'owner' }] });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const existing = await Interest.findOne({ where: { user_id: req.user.id, project_id: req.params.projectId } });
    if (existing) return res.status(400).json({ success: false, message: 'Already expressed interest' });
    const interest = await Interest.create({ ...req.body, user_id: req.user.id, project_id: req.params.projectId });
    await project.increment('interests_count');
    await Notification.create({
      user_id: project.user_id,
      title: 'New Investment Interest',
      message: `${req.user.first_name} ${req.user.last_name} expressed interest in ${project.title}`,
      type: 'interest', reference_id: interest.id, reference_type: 'interest',
    });
    try { await sendEmail({ to: project.owner.email, subject: 'New Interest in Your Project', html: emailTemplates.interestReceived(project.title, `${req.user.first_name} ${req.user.last_name}`) }); } catch(e) {}
    res.status(201).json({ success: true, data: interest });
  } catch (error) { next(error); }
};

// @GET /api/interests/my
exports.getMyInterests = async (req, res, next) => {
  try {
    const interests = await Interest.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Project, as: 'project', attributes: ['id','title','primary_sector','district','status','total_cost'] }],
      order: [['created_at', 'DESC']],
    });
    res.status(200).json({ success: true, data: interests });
  } catch (error) { next(error); }
};

// @GET /api/interests/project/:projectId
exports.getProjectInterests = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const interests = await Interest.findAll({
      where: { project_id: req.params.projectId },
      include: [{ model: User, as: 'investor', attributes: ['id','first_name','last_name','email','phone','organization'] }],
      order: [['created_at', 'DESC']],
    });
    res.status(200).json({ success: true, data: interests });
  } catch (error) { next(error); }
};

// @PUT /api/interests/:id/respond
exports.respondToInterest = async (req, res, next) => {
  try {
    const interest = await Interest.findByPk(req.params.id, { include: [{ model: Project, as: 'project' }] });
    if (!interest) return res.status(404).json({ success: false, message: 'Interest not found' });
    if (interest.project.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    await interest.update({ owner_response: req.body.response, status: 'owner_replied', owner_responded_at: new Date() });
    await Notification.create({
      user_id: interest.user_id,
      title: 'Project Owner Replied',
      message: `The owner of "${interest.project.title}" has responded to your interest.`,
      type: 'interest', reference_id: interest.id, reference_type: 'interest',
    });
    res.status(200).json({ success: true, data: interest });
  } catch (error) { next(error); }
};
