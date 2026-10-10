import { createDeepgramConnection } from '../services/sttService.js';
import { ConversationEngine } from '../services/conversationEngine.js';
import { checkSlots, createBooking, getBusinessInfo, transferCall } from '../services/bookingFunctions.js';
import { releaseSlotLock, getAvailableSlots } from '../services/slotService.js';
import { db } from '../db/pool.js';
import { sendOwnerNotificationSMS } from '../services/smsService.js';
import { liveCallEvents } from '../services/liveEventBus.js';

// In-memory map of active call sessions
const activeSessions = new Map();

/**
 * Handle a new WebSocket connection from Twilio Media Streams.
 * Twilio sends binary μ-law audio; we pipe it to Deepgram STT → LLM → TTS → back to Twilio.
 */
export async function handleCallWebSocket(ws, callSid) {
  let session = null;
  let dgConnection = null;
  let transcriptBuffer = '';
  let utteranceTimer = null;

  // ── Load business by Twilio number ──────────────────────
  async function loadBusiness(twilioNumber) {
    const snap = await db.collection('businesses')
      .where('twilio_number', '==', twilioNumber)
      .where('is_active', '==', true)
      .limit(1)
      .get();
      
    if (snap.empty) return null;
    
    const doc = snap.docs[0];
    const business = { id: doc.id, ...doc.data() };
    
    const servicesSnap = await db.collection(`businesses/${doc.id}/services`)
      .where('is_active', '==', true)
      .orderBy('display_order')
      .get();
      
    business.services = servicesSnap.docs.map(s => ({ id: s.id, ...s.data() }));
    return business;
  }

  // ── Check business hours ─────────────────────────────────
  function isWithinBusinessHours(business) {
    const now = new Date();
    const tz = business.timezone || 'UTC';
    const dayKey = now.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz }).toLowerCase();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, timeZone: tz, hour: '2-digit', minute: '2-digit' });

    const hours = business.working_hours?.[dayKey];
    if (!hours?.active) return false;

    return timeStr >= hours.open && timeStr <= hours.close;
  }

  // ── Save call log on completion ──────────────────────────
  async function saveCallLog({ outcome, bookingId } = {}) {
    if (!session) return;
    const transcript = session.conversationEngine?.getTranscript() || [];
    try {
      // Upsert call log by callSid
      const snap = await db.collection('call_logs').where('call_sid', '==', callSid).get();
      const payload = {
        business_id: session.business.id,
        call_sid: callSid,
        caller_number: session.callerNumber,
        ended_at: new Date().toISOString(),
        duration_sec: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
        transcript: JSON.stringify(transcript),
        booking_id: bookingId || null,
        outcome: outcome || 'unknown'
      };

      if (!snap.empty) {
        await snap.docs[0].ref.update(payload);
      } else {
        payload.started_at = session.startedAt.toISOString();
        await db.collection('call_logs').add(payload);
      }
    } catch (err) {
      console.error('[WS] Failed to save call log:', err.message);
    }
  }

  // ── TTS: Send spoken text back to Twilio via WebSocket ──
  async function speakToCallerViaTTS(text) {
    // Option A: Use Twilio's built-in TTS via a mid-call TwiML update
    // This sends a REST call to update the call's TwiML mid-stream
    if (!session?.callSid) return;

    // Architecture Option C (Malaysian-First):
    // Use Mesolitica TTS (backend/src/services/mesolitica/tts.js) to generate Malaysian-accented audio,
    // then stream the audio back to Twilio.
    // For MVP, we use Twilio's <Say> TwiML via the REST API update
    try {
      const twilio = (await import('twilio')).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      // We send text to Twilio which will TTS it using Polly
      // The actual audio injection happens via Twilio Media Stream + a separate TTS service
      // For now, log and store for dashboard display
      console.log(`[TTS] → "${text}"`);

      // Real implementation: pipe ElevenLabs audio frames back through ws as Twilio mulaw
      // See: ElevenLabs streaming → resample to 8kHz mulaw → send as base64 media messages
    } catch (err) {
      console.error('[TTS] Error:', err.message);
    }
  }

  // ── WebSocket message handler ────────────────────────────
  ws.on('message', async (rawData) => {
    try {
      const msg = JSON.parse(rawData);

      switch (msg.event) {
        case 'connected':
          console.log(`[WS] Call ${callSid} connected`);
          break;

        case 'start': {
          const { streamSid, callSid: sid, customParameters } = msg.start;
          const twilioNumber = customParameters?.twilioNumber || process.env.TWILIO_PHONE_NUMBER;
          const callerNumber = customParameters?.callerNumber || 'Unknown';

          const business = await loadBusiness(twilioNumber);
          if (!business) {
            console.error(`[WS] No business found for number ${twilioNumber}`);
            ws.close();
            return;
          }

          // Load today's slots into session context
          const today = new Date().toLocaleDateString('en-CA', { timeZone: business.timezone });
          const todaySlots = await getAvailableSlots(business.id, today);

          // Set up conversation engine
          const conversationEngine = new ConversationEngine({
            business,
            callSid,
            callerNumber,
            onToolCall: async (toolName, args) => {
              switch (toolName) {
                case 'check_slots':     return checkSlots(args, business);
                case 'create_booking':  {
                  const booking = await createBooking(args, business, callSid);
                  // Notify owner
                  sendOwnerNotificationSMS({
                    ownerPhone: business.owner_phone,
                    customerName: args.customer_name,
                    serviceName: booking.service || 'Service',
                    startTime: booking.startTime,
                  }).catch(() => {});
                  session.bookingId = booking.bookingId;
                  return booking;
                }
                case 'get_business_info': return getBusinessInfo(args, business);
                case 'transfer_call':     return transferCall(args);
                default:
                  return { error: 'Unknown tool' };
              }
            },
            onResponse: speakToCallerViaTTS,
            onStateChange: (state) => {
              liveCallEvents.emit('state_change', { callSid, callerNumber, state });
              db.collection('live_calls').doc(callSid).set({
                business_id: business.id,
                caller_number: callerNumber,
                state: state,
                updated_at: new Date().toISOString()
              }, { merge: true }).catch(() => {});
            }
          });

          conversationEngine.setTodaySlots(todaySlots);

          session = {
            business,
            callSid,
            callerNumber,
            streamSid,
            startedAt: new Date(),
            conversationEngine,
            bookingId: null,
          };

          activeSessions.set(callSid, session);

          // Log call start and add to live calls
          try {
            const snap = await db.collection('call_logs').where('call_sid', '==', callSid).get();
            if (snap.empty) {
              await db.collection('call_logs').add({
                business_id: business.id,
                call_sid: callSid,
                caller_number: callerNumber,
                started_at: new Date().toISOString(),
                outcome: 'in_progress'
              });
            }
            // Add to live calls monitor
            liveCallEvents.emit('state_change', { callSid, callerNumber, state: 'INCOMING_CALL' });
            await db.collection('live_calls').doc(callSid).set({
              business_id: business.id,
              caller_number: callerNumber,
              state: 'INCOMING_CALL',
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          } catch (e) {}

          // Check business hours
          if (!isWithinBusinessHours(business)) {
            await conversationEngine.onResponse(
              `Thank you for calling ${business.name}. We're currently closed. ` +
              `Please call back during our business hours, or leave us a text at this number.`
            );
            await saveCallLog({ outcome: 'out_of_hours' });
            ws.close();
            return;
          }

          // Greet the caller!
          await conversationEngine.greet();
          break;
        }

        case 'media': {
          if (!session || !dgConnection) return;
          // Twilio sends audio as base64-encoded μ-law 8kHz
          const audioBuffer = Buffer.from(msg.media.payload, 'base64');
          dgConnection.send(audioBuffer);
          break;
        }

        case 'stop':
          console.log(`[WS] Call ${callSid} stopped`);
          const outcome = session?.bookingId ? 'booking_confirmed' : 'inquiry';
          await saveCallLog({ outcome, bookingId: session?.bookingId });
          break;
      }
    } catch (err) {
      console.error(`[WS] Error processing message for ${callSid}:`, err.message);
    }
  });

  // ── Set up STT (Option C: Mesolitica Speech Model) ─────────
  // Note: To fully implement Option C, replace Deepgram here with a streaming wrapper 
  // around backend/src/services/mesolitica/speech.js
  setTimeout(() => {
    if (!session) return;
    dgConnection = createDeepgramConnection({
      callSid,
      language: session?.business?.language || 'en',
      onTranscript: (text, isFinal) => {
        transcriptBuffer += ' ' + text;

        if (isFinal) {
          const utterance = transcriptBuffer.trim();
          transcriptBuffer = '';

          if (utterance.length > 2) {
            console.log(`[STT] "${utterance}"`);
            session?.conversationEngine?.process(utterance);
          }
        }
      },
      onError: (err) => {
        console.error('[STT] Deepgram error:', err);
      },
    });
  }, 1000);

  // ── Cleanup on disconnect ────────────────────────────────
  ws.on('close', async () => {
    console.log(`[WS] Connection closed for call ${callSid}`);

    // Release any slot locks held by this call
    const released = await releaseSlotLock(callSid);
    if (released > 0) {
      console.log(`[WS] Released ${released} slot lock(s) for call ${callSid}`);
    }

    dgConnection?.finish?.();
    activeSessions.delete(callSid);
    liveCallEvents.emit('state_change', { callSid, callerNumber: session?.callerNumber || 'Unknown', state: 'CALL_ENDED' });
    db.collection('live_calls').doc(callSid).delete().catch(() => {});
  });

  ws.on('error', (err) => {
    console.error(`[WS] WebSocket error for call ${callSid}:`, err.message);
  });
}

// Export for monitoring/admin
export function getActiveSessionCount() {
  return activeSessions.size;
}
