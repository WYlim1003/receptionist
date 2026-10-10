import { Router } from 'express';
import { db } from '../db/pool.js'; // Firebase DB
import { liveCallEvents } from '../services/liveEventBus.js';

export const callLogsRouter = Router();

/**
 * GET /api/calls?businessId=...
 */
callLogsRouter.get('/', async (req, res, next) => {
  try {
    const { businessId, limit = 50 } = req.query;
    if (!businessId) return res.status(400).json({ error: 'businessId required' });

    const snap = await db.collection('call_logs')
      .where('business_id', '==', businessId)
      .orderBy('started_at', 'desc')
      .limit(Number(limit))
      .get();
      
    const calls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch related bookings to attach patient info if needed
    for (const call of calls) {
      if (call.booking_id) {
        const bookingDoc = await db.collection('bookings').doc(call.booking_id).get();
        if (bookingDoc.exists) {
          const bd = bookingDoc.data();
          call.booking = {
            id: bookingDoc.id,
            customer_name: bd.customer_name,
            service: bd.service,
            status: bd.status
          };
        }
      }
    }

    res.json(calls);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/calls/:id
 */
callLogsRouter.get('/:id', async (req, res, next) => {
  try {
    const doc = await db.collection('call_logs').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Call log not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/calls/stats/:businessId
 */
callLogsRouter.get('/stats/:businessId', async (req, res, next) => {
  try {
    const { businessId } = req.params;
    
    // In Firestore, aggregation queries (like COUNT, SUM) require special handling.
    // For MVP, we fetch the recent logs and compute stats in-memory, or use Firebase Aggregation queries.
    const snap = await db.collection('call_logs')
      .where('business_id', '==', businessId)
      .get();

    const calls = snap.docs.map(d => d.data());
    
    const total = calls.length;
    const handled = calls.filter(c => c.outcome === 'booking_confirmed' || c.outcome === 'inquiry').length;
    const missed = calls.filter(c => c.outcome === 'missed' || c.outcome === 'voicemail').length;

    res.json({
      total_calls: total,
      handled_by_ai: handled,
      missed_calls: missed,
      bookings_generated: calls.filter(c => c.booking_id).length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/calls/live
 * SSE endpoint for live call states
 */
callLogsRouter.get('/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onStateChange = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  liveCallEvents.on('state_change', onStateChange);

  req.on('close', () => {
    liveCallEvents.removeListener('state_change', onStateChange);
  });
});
