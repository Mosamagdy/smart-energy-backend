const nodemailer = require('nodemailer');

/**
 * Creates a reusable SMTP transporter from .env config
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends OTP code to user email
 * @param {string} to      - recipient email
 * @param {string} otpCode - 6-digit code
 */
async function sendOtpEmail(to, otpCode) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"نظام الطاقة الذكي" <${process.env.SMTP_FROM}>`,
    to,
    subject: 'رمز التحقق الخاص بك',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 400px; margin: auto;">
        <h2 style="color: #1a1a2e;">نظام الطاقة الذكي</h2>
        <p>مرحباً،</p>
        <p>رمز التحقق الخاص بك هو:</p>
        <div style="
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #22c55e;
          text-align: center;
          padding: 20px;
          background: #f0fdf4;
          border-radius: 8px;
          margin: 20px 0;
        ">
          ${otpCode}
        </div>
        <p style="color: #666;">صالح لمدة <strong>10 دقائق</strong> فقط.</p>
        <p style="color: #999; font-size: 12px;">إذا لم تطلب هذا الرمز، تجاهل هذا البريد.</p>
      </div>
    `,
  });
}


/**
 * Sends welcome email with login credentials (for employees and clients)
 * @param {string} to         - recipient email
 * @param {string} body       - email body (HTML)
 * @param {string} subject    - email subject
 */
async function sendWelcomeEmail(to, body, subject = 'مرحباً بكم في شركة Smart Energy') {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"شركة Smart Energy للطاقة" <${process.env.SMTP_FROM}>`,
    to,
    subject: subject || 'مرحباً بكم في شركة Smart Energy - بيانات حسابكم',
    html: body,
  });
}


module.exports = { sendOtpEmail, sendWelcomeEmail };
