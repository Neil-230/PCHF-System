export const sendSMS = async (to, body) => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM || !to || !body) {
    return { skipped: true };
  }
  let twilioMod;
  try {
    twilioMod = (await import('twilio')).default;
  } catch {
    return { skipped: true };
  }
  const client = twilioMod(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client.messages.create({ from: TWILIO_FROM, to, body });
};
