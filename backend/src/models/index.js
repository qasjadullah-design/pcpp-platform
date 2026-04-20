const User = require('./User');
const Project = require('./Project');
const Interest = require('./Interest');
const Notification = require('./Notification');
const ProjectUpdate = require('./ProjectUpdate');
const SavedProject = require('./SavedProject');

// Associations
User.hasMany(Project, { foreignKey: 'user_id', as: 'projects' });
Project.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

User.hasMany(Interest, { foreignKey: 'user_id', as: 'interests' });
Interest.belongsTo(User, { foreignKey: 'user_id', as: 'investor' });
Project.hasMany(Interest, { foreignKey: 'project_id', as: 'interests' });
Interest.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Project.hasMany(ProjectUpdate, { foreignKey: 'project_id', as: 'updates' });
ProjectUpdate.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
User.hasMany(ProjectUpdate, { foreignKey: 'user_id', as: 'project_updates' });

User.hasMany(SavedProject, { foreignKey: 'user_id', as: 'saved_projects' });
SavedProject.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Project.hasMany(SavedProject, { foreignKey: 'project_id', as: 'saved_by' });
SavedProject.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

module.exports = { User, Project, Interest, Notification, ProjectUpdate, SavedProject };
