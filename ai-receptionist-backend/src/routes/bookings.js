import { Router } from 'express';
import { db } from '../db/pool.js'; // Firebase DB

export const bookingsRouter = Router();

/**
 * GET /api/bookings?businessId=...&date=...
 */
bookingsRouter.get('/', async (req, res, next) => {
  try {
    const { businessId, date, status } = req.query;
    if (!businessId) return res.status(400).json({ error: 'businessId required' });

    let queryRef = db.collection('bookings').where('business_id', '==', businessId);
    
    if (date) {
      queryRef = queryRef.where('booking_date', '==', date);
    }
    if (status) {
      queryRef = queryRef.where('status', '==', status);
    }

    const snap = await queryRef.orderBy('start_time').get();
    const bookings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bookings/:id
 */
bookingsRouter.get('/:id', async (req, res, next) => {
  try {
    const doc = await db.collection('bookings').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Booking not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bookings
 */
bookingsRouter.post('/', async (req, res, next) => {
  try {
    const data = req.body;
    data.created_at = new Date().toISOString();
    
    // Default status if not provided
    if (!data.status) data.status = 'confirmed';

    const docRef = await db.collection('bookings').add(data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/bookings/:id
 */
bookingsRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = req.body;
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    await db.collection('bookings').doc(req.params.id).set(data, { merge: true });
    const updated = await db.collection('bookings').doc(req.params.id).get();
    
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/bookings/:id
 */
bookingsRouter.delete('/:id', async (req, res, next) => {
  try {
    await db.collection('bookings').doc(req.params.id).update({ status: 'cancelled' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
