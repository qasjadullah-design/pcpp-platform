const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  first_name: { type: DataTypes.STRING(100), allowNull: false },
  last_name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(20) },
  organization: { type: DataTypes.STRING(200) },
  role: { type: DataTypes.ENUM('admin', 'project_owner', 'investor', 'government', 'ngo'), defaultValue: 'investor' },
  status: { type: DataTypes.ENUM('active', 'inactive', 'suspended'), defaultValue: 'active' },
  avatar: { type: DataTypes.STRING(500) },
  reset_password_token: { type: DataTypes.STRING(255) },
  reset_password_expire: { type: DataTypes.DATE },
  email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  email_verify_token: { type: DataTypes.STRING(255) },
  last_login: { type: DataTypes.DATE },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
    },
  },
});

User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.reset_password_token;
  delete values.email_verify_token;
  return values;
};

module.exports = User;
