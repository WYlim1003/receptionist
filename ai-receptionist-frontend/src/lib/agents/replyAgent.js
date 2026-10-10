/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 5: ReplyAgent (Suggested Reply Generator)
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibility:
 *   Use Google Gemini to generate 3 contextual, professional reply options for
 *   the merchant to send back to the customer. Replies are tailored to:
 *     - The customer's intent
 *     - The language/dialect used
 *     - A professional but friendly tone for a small business
 *
 *   Falls back to template-based replies if Gemini is unavailable.
 *
 * Input:  { transcription, intent, explanation, language }
 * Output: { replies: Array<{ label: string, text: string, tone: string }> }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BACKEND_URL = 'http://127.0.0.1:3001';

export async function runReplyAgent({ transcription, intent, explanation, language, onLog }) {
  onLog(`💬 ReplyAgent: Generating suggested replies using Gemini...`);

  try {
    const bookedSlots = window.CURRENT_BOOKED_SLOTS || [];
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/suggest-replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcription, intent, explanation, language, bookedSlots }),
    });

    if (!response.ok) throw new Error(`Backend /suggest-replies returned ${response.status}`);

    const data = await response.json();
    const replies = data.replies || [];

    if (data.autoBooked) {
      onLog(`⚡ ReplyAgent: Auto-booking detected! Scheduling slot for ${new Date(data.autoBooked.start_time).toLocaleTimeString()}`);
      window.dispatchEvent(new CustomEvent('auto-book', { detail: data.autoBooked }));
    }

    onLog(`✅ ReplyAgent (Gemini): Generated ${replies.length} reply option(s).`);

    return { replies, model: 'gemini' };
  } catch (err) {
    onLog(`⚠️  ReplyAgent: Gemini unavailable (${err.message}). Using fallback template replies...`);
    return _fallbackTemplateReplies({ intent, language, onLog });
  }
}

function _fallbackTemplateReplies({ intent, language, onLog }) {
  const intentLower = (intent || '').toLowerCase();

  let replies = [];

  if (intentLower.includes('book') || intentLower.includes('appointment') || intentLower.includes('slot')) {
    replies = [
      {
        label: '📅 Confirm Booking',
        text: 'Hi! Thanks for reaching out. We would love to book you in! Could you please let us know your preferred date and time?',
        tone: 'friendly',
      },
      {
        label: '📋 Ask for Details',
        text: 'Hello! To help you with the booking, could you share the service you need and your preferred timing? We\'ll check availability right away.',
        tone: 'professional',
      },
      {
        label: '✅ Direct Confirm',
        text: 'Sure! We can fit you in. Please come in during our opening hours or let us know a specific time that works for you.',
        tone: 'casual',
      },
    ];
  } else if (intentLower.includes('price') || intentLower.includes('cost') || intentLower.includes('how much')) {
    replies = [
      {
        label: '💰 Share Pricing',
        text: 'Hi! Thanks for asking. Our pricing varies by service. Could you let us know what service you are looking for so I can provide the exact price?',
        tone: 'friendly',
      },
      {
        label: '📲 Direct to Price List',
        text: 'Hello! Our price list is available on request. What specific service are you interested in?',
        tone: 'professional',
      },
      {
        label: '🤝 Invite for Consultation',
        text: 'Great question! Prices depend on the service. Feel free to drop by or tell me more and I\'ll give you an exact quote!',
        tone: 'casual',
      },
    ];
  } else if (intentLower.includes('hour') || intentLower.includes('open') || intentLower.includes('time')) {
    replies = [
      {
        label: '🕐 Share Hours',
        text: 'Hi! We are open Monday to Saturday, 9am - 6pm. Feel free to drop by or contact us during those hours!',
        tone: 'friendly',
      },
      {
        label: '📅 Detailed Schedule',
        text: 'Hello! Our business hours are Monday–Friday: 9am–6pm, Saturday: 10am–4pm, and we are closed on Sundays.',
        tone: 'professional',
      },
      {
        label: '🙌 Casual Hours Reply',
        text: 'We\'re open most days from 9 to 6! Saturdays we close a bit earlier. Come on in anytime!',
        tone: 'casual',
      },
    ];
  } else {
    // Generic fallback
    replies = [
      {
        label: '👋 Acknowledge & Help',
        text: 'Hi there! Thank you for your message. We\'ll get back to you shortly with the information you need. Is there anything specific we can help with?',
        tone: 'friendly',
      },
      {
        label: '📞 Offer a Call',
        text: 'Hello! Thanks for reaching out. For faster assistance, you\'re welcome to call us directly or we can arrange a callback.',
        tone: 'professional',
      },
      {
        label: '🤝 Simple Acknowledge',
        text: 'Got your message! Let me check on that for you and get back to you very soon 😊',
        tone: 'casual',
      },
    ];
  }

  onLog(`✅ ReplyAgent (fallback): Generated ${replies.length} template replies for intent: "${intent}"`);
  return { replies, model: 'template-fallback' };
}
