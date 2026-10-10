import { Router } from 'express';
import twilio from 'twilio';
import { db } from '../db/pool.js'; // Firebase
import { buildVoicemailTwiML, buildTransferTwiML } from '../services/smsService.js';

export const twilioRouter = Router();

const BACKEND_URL = process.env.BACKEND_URL || 'https://your-backend.com';

/**
 * POST /api/twilio/inbound
 * Twilio webhook — called when a new inbound call arrives.
 */
twilioRouter.post('/inbound', async (req, res) => {
  const body = req.body?.toString?.() || '';
  const params = new URLSearchParams(body);

  const callSid = params.get('CallSid') || req.query.CallSid || '';
  const callerNumber = params.get('From') || '';
  const twilioNumber = params.get('To') || '';

  console.log(`[TWILIO] Inbound call ${callSid} from ${callerNumber} → ${twilioNumber}`);

  // Look up the business for this Twilio number
  const snap = await db.collection('businesses')
    .where('twilio_number', '==', twilioNumber)
    .where('is_active', '==', true)
    .limit(1)
    .get();

  if (snap.empty) {
    console.error(`[TWILIO] No business found for number ${twilioNumber}`);
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, this number is not configured. Goodbye.</Say>
  <Hangup/>
</Response>`);
    return;
  }

  // TwiML response — connect to Media Streams WebSocket
  const wsUrl = `${BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws/call`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="twilioNumber" value="${twilioNumber}" />
      <Parameter name="callerNumber" value="${callerNumber}" />
      <Parameter name="callSid" value="${callSid}" />
    </Stream>
  </Connect>
</Response>`;

  res.type('text/xml').send(twiml);
});

/**
 * POST /api/twilio/voicemail-complete
 */
twilioRouter.post('/voicemail-complete', async (req, res) => {
  const body = req.body?.toString?.() || '';
  const params = new URLSearchParams(body);
  const callSid = params.get('CallSid');
  const recordingUrl = params.get('RecordingUrl');
  const transcriptionText = params.get('TranscriptionText');

  console.log(`[TWILIO] Voicemail for ${callSid}: ${transcriptionText}`);

  try {
    const snap = await db.collection('call_logs').where('call_sid', '==', callSid).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      const transcript = data.transcript ? JSON.parse(data.transcript) : [];
      transcript.push({ role: 'voicemail', text: transcriptionText });
      
      await doc.ref.update({
        recording_url: recordingUrl,
        outcome: 'voicemail',
        transcript: JSON.stringify(transcript)
      });
    }
  } catch (err) {
    console.error('[TWILIO] Voicemail log error:', err.message);
  }

  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
});

/**
 * POST /api/twilio/transfer-complete
 */
twilioRouter.post('/transfer-complete', async (req, res) => {
  const body = req.body?.toString?.() || '';
  const params = new URLSearchParams(body);
  const dialStatus = params.get('DialCallStatus');
  const callSid = params.get('CallSid');

  console.log(`[TWILIO] Transfer complete for ${callSid}: ${dialStatus}`);

  if (dialStatus !== 'completed') {
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, we couldn't connect you to the team right now. Please try calling back later. Goodbye.</Say>
  <Hangup/>
</Response>`);
    return;
  }

  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
});

/**
 * GET /api/twilio/status
 */
twilioRouter.get('/status', async (_req, res) => {
  try {
    const snap = await db.collection('call_logs').where('outcome', '==', 'in_progress').get();
    res.json({
      status: 'ok',
      activeCalls: snap.size,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
