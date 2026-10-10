import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send a booking confirmation SMS to the customer.
 */
export async function sendBookingConfirmationSMS({ to, businessName, serviceName, startTime, bookingId }) {
  if (!to || to === 'Unknown') {
    console.log('[SMS] No phone number — skipping confirmation SMS');
    return;
  }

  const date = new Date(startTime).toLocaleDateString('en-MY', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = new Date(startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const body = `✅ Booking Confirmed!\n${businessName}\nService: ${serviceName}\nDate: ${date}\nTime: ${time}\n\nReply CANCEL to cancel. Ref: ${bookingId.slice(0, 8).toUpperCase()}`;

  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log(`[SMS] Confirmation sent to ${to}: ${message.sid}`);
    return message.sid;
  } catch (err) {
    console.error(`[SMS] Failed to send to ${to}:`, err.message);
    throw err;
  }
}

/**
 * Send a notification SMS to the business owner about a new booking.
 */
export async function sendOwnerNotificationSMS({ ownerPhone, customerName, serviceName, startTime }) {
  if (!ownerPhone) return;

  const time = new Date(startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: process.env.DEFAULT_TIMEZONE,
  });
  const date = new Date(startTime).toLocaleDateString('en-MY', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: process.env.DEFAULT_TIMEZONE,
  });

  const body = `📅 New Booking!\nCustomer: ${customerName}\nService: ${serviceName}\nTime: ${date} at ${time}`;

  try {
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: ownerPhone,
    });
  } catch (err) {
    console.error('[SMS] Owner notification failed:', err.message);
  }
}

/**
 * Generate TwiML for transferring a call to the owner's mobile.
 */
export function buildTransferTwiML(ownerPhone) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Please hold while I transfer your call.</Say>
  <Dial timeout="30" action="/api/twilio/transfer-complete">
    <Number>${ownerPhone}</Number>
  </Dial>
</Response>`;
}

/**
 * Generate TwiML for out-of-hours voicemail.
 */
export function buildVoicemailTwiML(businessName, hours) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Thank you for calling ${businessName}. 
    We are currently closed. 
    Our hours are ${hours}. 
    Please leave your name and number after the beep and we will call you back.
  </Say>
  <Record maxLength="60" action="/api/twilio/voicemail-complete" transcribe="true" />
</Response>`;
}
