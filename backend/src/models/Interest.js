const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Interest = sequelize.define('Interest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  project_id: { type: DataTypes.UUID, allowNull: false },
  message: { type: DataTypes.TEXT },
  investment_range_min: { type: DataTypes.DECIMAL(20, 2) },
  investment_range_max: { type: DataTypes.DECIMAL(20, 2) },
  status: { type: DataTypes.ENUM('pending','owner_replied','closed'), defaultValue: 'pending' },
  owner_response: { type: DataTypes.TEXT },
  owner_responded_at: { type: DataTypes.DATE },
}, { tableName: 'interests' });

module.exports = Interest;
