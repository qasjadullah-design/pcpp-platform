const crypto = require('crypto');
const { User } = require('../models');
const { sendTokenResponse } = require('../utils/jwt');
const { sendEmail, emailTemplates } = require('../utils/email');
const { validationResult } = require('express-validator');

// @POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { first_name, last_name, email, password, phone, organization } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ first_name, last_name, email, password, phone, organization });
    try { await sendEmail({ to: email, subject: 'Welcome to PCPP', html: emailTemplates.welcome(first_name) }); } catch (e) {}
    sendTokenResponse(user, 201, res);
  } catch (error) { next(error); }
};

// @POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password' });
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (user.status !== 'active') return res.status(401).json({ success: false, message: 'Account is not active' });
    await user.update({ last_login: new Date() });
    sendTokenResponse(user, 200, res);
  } catch (error) { next(error); }
};

// @GET /api/auth/me
exports.getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

// @POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) return res.status(404).json({ success: false, message: 'No user with that email' });
    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    await user.update({
      reset_password_token: hashedToken,
      reset_password_expire: new Date(Date.now() + 10 * 60 * 1000),
    });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail({ to: user.email, subject: 'Password Reset - PCPP', html: emailTemplates.resetPassword(resetUrl) });
    res.status(200).json({ success: true, message: 'Password reset email sent' });
  } catch (error) { next(error); }
};

// @PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: { reset_password_token: hashedToken, reset_password_expire: { [Op.gt]: new Date() } },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    await user.update({ password: req.body.password, reset_password_token: null, reset_password_expire: null });
    sendTokenResponse(user, 200, res);
  } catch (error) { next(error); }
};

// @PUT /api/auth/update-password
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!(await user.matchPassword(req.body.current_password))) {
      return res.status(401).json({ success: false, message: 'Current password incorrect' });
    }
    await user.update({ password: req.body.new_password });
    sendTokenResponse(user, 200, res);
  } catch (error) { next(error); }
};

// @PUT /api/auth/update-profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, organization } = req.body;
    await req.user.update({ first_name, last_name, phone, organization });
    res.status(200).json({ success: true, user: req.user });
  } catch (error) { next(error); }
};
