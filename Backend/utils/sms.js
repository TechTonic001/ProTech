// utils/sms.js

const sendSMS = async (phoneNumber, message) => {
  console.log(`SMS to ${phoneNumber}: ${message} — SMS feature coming in future version`);
  return { success: true, note: 'SMS is a future feature' };
};

module.exports = {
  sendSMS,
};
