const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to, subject, html,
    });
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error('Email error:', error);
    throw new Error('Email could not be sent');
  }
};

const emailTemplates = {
  welcome: (name) => `<h2>Welcome to PCPP, ${name}!</h2><p>Your account has been created successfully.</p>`,
  resetPassword: (resetUrl) => `<h2>Password Reset</h2><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 10 minutes.</p>`,
  projectApproved: (projectTitle) => `<h2>Project Approved!</h2><p>Your project "${projectTitle}" has been approved and is now live on PCPP.</p>`,
  projectRejected: (projectTitle, reason) => `<h2>Project Review Update</h2><p>Your project "${projectTitle}" requires changes: ${reason}</p>`,
  interestReceived: (projectTitle, investorName) => `<h2>New Investment Interest</h2><p>${investorName} has expressed interest in your project "${projectTitle}".</p>`,
};

module.exports = { sendEmail, emailTemplates };
