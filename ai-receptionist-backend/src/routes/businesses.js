import { Router } from 'express';
import { db } from '../db/pool.js'; // This is now Firebase DB

export const businessRouter = Router();

/**
 * GET /api/businesses/:id
 * Get full business profile including services.
 */
businessRouter.get('/:id', async (req, res, next) => {
  try {
    const doc = await db.collection('businesses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Business not found' });

    const business = { id: doc.id, ...doc.data() };
    
    // Fetch services subcollection
    const servicesSnap = await db.collection(`businesses/${req.params.id}/services`)
      .where('is_active', '==', true)
      .orderBy('display_order')
      .get();
      
    business.services = servicesSnap.docs.map(s => ({ id: s.id, ...s.data() }));

    res.json(business);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/businesses/:id
 * Update business profile, hours, greeting, etc.
 */
businessRouter.put('/:id', async (req, res, next) => {
  try {
    const data = req.body;
    // Clean undefined values
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
    data.updated_at = new Date().toISOString();

    await db.collection('businesses').doc(req.params.id).set(data, { merge: true });
    
    const updated = await db.collection('businesses').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/businesses/:id/services
 * Add a service to the business.
 */
businessRouter.post('/:id/services', async (req, res, next) => {
  try {
    const data = req.body;
    data.is_active = true;
    data.created_at = new Date().toISOString();
    
    const docRef = await db.collection(`businesses/${req.params.id}/services`).add(data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/businesses/:id/services/:serviceId
 * Update a service.
 */
businessRouter.put('/:id/services/:serviceId', async (req, res, next) => {
  try {
    const data = req.body;
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
    
    await db.collection(`businesses/${req.params.id}/services`).doc(req.params.serviceId).set(data, { merge: true });
    
    const updated = await db.collection(`businesses/${req.params.id}/services`).doc(req.params.serviceId).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/businesses/:id/services/:serviceId
 * Deactivate a service (soft delete).
 */
businessRouter.delete('/:id/services/:serviceId', async (req, res, next) => {
  try {
    await db.collection(`businesses/${req.params.id}/services`).doc(req.params.serviceId).update({ is_active: false });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
