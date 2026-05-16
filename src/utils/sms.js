/**
 * Sends OTP code via WhatsApp using Twilio
 * Required .env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM  →  whatsapp:+14155238886
 *
 * The recipient number must have joined the Twilio sandbox first
 * by sending "join <sandbox-keyword>" to the Twilio WhatsApp number
 */
async function sendOtpWhatsApp(phone, otpCode) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[WhatsApp] Twilio not configured — skipping WhatsApp send.');
    return;
  }

  if (!phone) {
    console.warn('[WhatsApp] No phone number provided — skipping WhatsApp send.');
    return;
  }

  // Ensure phone is in WhatsApp format: whatsapp:+201xxxxxxxxx
  const toNumber = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;

  const twilio = require('twilio')(accountSid, authToken);

  await twilio.messages.create({
    from: fromNumber,
    to:   toNumber,
    body: `مرحباً 👋\nرمز التحقق الخاص بك في *نظام الطاقة الذكي* هو:\n\n*${otpCode}*\n\nصالح لمدة 10 دقائق فقط.\nلا تشارك هذا الرمز مع أحد.`,
  });

  console.log(`[WhatsApp] OTP sent to ${toNumber}`);
}

module.exports = { sendOtpWhatsApp };
