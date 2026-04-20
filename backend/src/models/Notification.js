const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('project_update','interest','approval','rejection','changes_requested','system'), defaultValue: 'system' },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  reference_id: { type: DataTypes.UUID },
  reference_type: { type: DataTypes.STRING(50) },
}, { tableName: 'notifications' });

module.exports = Notification;
