const crypto = require('crypto');

/**
 * Generates a secure 6-digit OTP code
 * @returns {string} 6-digit string e.g. "048271"
 */
function generateOtp() {
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(6, '0');
}

module.exports = { generateOtp };
