const { Resend } = require('resend');

let resendInstance = global.__resend_instance;

if (!resendInstance) {
  const apiKey = process.env.RESEND_API_KEY || '';
  resendInstance = new Resend(apiKey);
  
  global.__resend_instance = resendInstance;
}

module.exports = resendInstance;
