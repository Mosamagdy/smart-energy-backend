/**
 * Mailer utility using Resend HTTP API
 * No SMTP needed - works on Railway
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'onboarding@resend.dev';
const TO_OVERRIDE = 'mosaamagdey@gmail.com'; // مؤقت للتجربة

async function sendEmail({ to, subject, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_OVERRIDE || to], // Override recipient for testing
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
}

/**
 * Sends OTP code to user email
 * @param {string} to      - recipient email
 * @param {string} otpCode - 6-digit code
 */
async function sendOtpEmail(to, otpCode) {
  await sendEmail({
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
 * @param {string} to      - recipient email
 * @param {string} body    - email body (HTML)
 * @param {string} subject - email subject
 */
async function sendWelcomeEmail(to, body, subject = 'مرحباً بكم في شركة Smart Energy') {
  await sendEmail({
    to,
    subject: subject || 'مرحباً بكم في شركة Smart Energy - بيانات حسابكم',
    html: body,
  });
}

module.exports = { sendOtpEmail, sendWelcomeEmail };