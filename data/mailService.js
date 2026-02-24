const nodemailer = require('nodemailer');

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

let transporter = null;

const getTransporter = () => {
  if (!EMAIL_ENABLED) return null;

  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = process.env.EMAIL_SECURE === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.warn('Email disabled: missing EMAIL_HOST / EMAIL_USER / EMAIL_PASS');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
};

const sendMail = async ({ to, subject, text, html }) => {
  const t = getTransporter();
  if (!t) return { skipped: true };

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!to) return { skipped: true };

  const info = await t.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return { skipped: false, messageId: info.messageId };
};

module.exports = {
  sendMail,
};
