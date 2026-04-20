const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectUpdate = sequelize.define('ProjectUpdate', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  update_type: {
    type: DataTypes.ENUM('milestone','progress','funding','construction','team','issue','announcement','general'),
    defaultValue: 'general'
  },
  attachments: { type: DataTypes.JSONB },
}, { tableName: 'project_updates' });

module.exports = ProjectUpdate;
