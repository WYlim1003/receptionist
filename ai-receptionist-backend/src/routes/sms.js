import { Router } from 'express';
import { db } from '../db/pool.js'; // Firebase DB

export const smsRouter = Router();

/**
 * POST /api/sms/reply
 * Twilio SMS webhook — handles inbound SMS replies (CANCEL, RESCHEDULE, etc.)
 */
smsRouter.post('/reply', async (req, res) => {
  const body = req.body?.toString?.() || '';
  const params = new URLSearchParams(body);

  const from = params.get('From');
  const messageBody = (params.get('Body') || '').trim().toUpperCase();

  console.log(`[SMS] Inbound from ${from}: ${messageBody}`);

  let replyText = '';

  if (messageBody === 'CANCEL') {
    // Find the most recent confirmed booking for this phone number
    const snap = await db.collection('bookings')
      .where('customer_phone', '==', from)
      .where('status', '==', 'confirmed')
      .get();

    if (snap.empty) {
      replyText = 'No upcoming booking found for your number. Please call us directly.';
    } else {
      // Sort by start_time descending locally since we can't always do it without composite index
      const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.start_time.localeCompare(a.start_time));
        
      const booking = bookings[0];
      
      // Cancel the booking
      await db.collection('bookings').doc(booking.id).update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      });

      // Get business name
      const bizDoc = await db.collection('businesses').doc(booking.business_id).get();
      const bizName = bizDoc.exists ? bizDoc.data().name : 'our business';
      
      replyText = `Your booking for ${booking.service} at ${bizName} has been cancelled. We hope to see you again soon!`;
    }
  } else if (messageBody === 'RESCHEDULE' || messageBody === 'CHANGE') {
    replyText = 'To reschedule, please call us directly. We\'d be happy to find a new time for you!';
  } else if (messageBody === 'HELP' || messageBody === 'INFO') {
    replyText = 'Reply CANCEL to cancel your appointment, or call us directly for any changes. Thank you!';
  } else {
    replyText = 'Thanks for your message! For bookings or changes, please call us directly.';
  }

  // Respond with TwiML SMS
  res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`);
});
