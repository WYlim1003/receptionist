import { Router } from 'express';
import { db } from '../db/pool.js'; // Firebase
import { getAvailableSlots, lockSlot, releaseSlotLock } from '../services/slotService.js';

export const slotsRouter = Router();

/**
 * GET /api/slots?businessId=...&date=2023-10-25
 */
slotsRouter.get('/', async (req, res, next) => {
  try {
    const { businessId, date } = req.query;
    if (!businessId || !date) return res.status(400).json({ error: 'businessId and date required' });

    const slots = await getAvailableSlots(businessId, date);
    res.json({ date, available_slots: slots });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/slots/range?businessId=...&from=...&to=...
 */
slotsRouter.get('/range', async (req, res, next) => {
  try {
    const { businessId, from, to } = req.query;
    if (!businessId || !from || !to) return res.status(400).json({ error: 'businessId, from, to required' });

    const startDate = new Date(from);
    const endDate = new Date(to);
    const result = {};

    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      result[dStr] = await getAvailableSlots(businessId, dStr);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/slots/block
 */
slotsRouter.post('/block', async (req, res, next) => {
  try {
    const { businessId, date, time, reason } = req.body;
    // We can just create a "booking" with status = "blocked"
    const data = {
      business_id: businessId,
      booking_date: date,
      start_time: time,
      status: 'blocked',
      service: reason || 'Blocked',
      created_at: new Date().toISOString()
    };
    const docRef = await db.collection('bookings').add(data);
    res.json({ id: docRef.id });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/slots/unblock
 */
slotsRouter.post('/unblock', async (req, res, next) => {
  try {
    const { businessId, date, time } = req.body;
    
    // Find blocked slots matching criteria
    const snap = await db.collection('bookings')
      .where('business_id', '==', businessId)
      .where('booking_date', '==', date)
      .where('start_time', '==', time)
      .where('status', '==', 'blocked')
      .get();
      
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
