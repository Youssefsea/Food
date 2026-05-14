const {brevo}=require('@getbrevo/brevo');

const getTransporter = () => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('BREVO_API_KEY is not set. Email sending will be skipped.');
    return null;
  }
  const client = brevo.ApiClient.instance;
  client.authentications["api-key"].
apiKey = process.env.BREVO_API_KEY;
  return new brevo.TransactionalEmailsApi();
};

const sendMail = async ({ to, subject, text, html }) => {
  const t = getTransporter();
  if (!t) {
    console.warn('Email sending skipped due to missing BREVO_API_KEY.');
    return { skipped: true, message: 'Email sending skipped' };
  }

  const from = 'noreply@yourdomain.com';

  const info = await t.sendTransacEmail({
    sender: { name: "أكلي", email: from },
    to: [{ email: to }],
    subject,
    text,
    html,
  });

  return { skipped: false, messageId: info.messageId };
};

module.exports = {
  sendMail,
};
