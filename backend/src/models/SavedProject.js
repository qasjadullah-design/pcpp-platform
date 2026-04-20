const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SavedProject = sequelize.define('SavedProject', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  project_id: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'saved_projects' });

module.exports = SavedProject;
