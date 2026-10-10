import { db } from '../db/pool.js'; // Firebase DB

/**
 * Get available slots for a specific date
 */
export async function getAvailableSlots(businessId, dateStr) {
  // 1. Fetch business hours
  const bizDoc = await db.collection('businesses').doc(businessId).get();
  if (!bizDoc.exists) return [];
  const biz = bizDoc.data();
  
  const d = new Date(dateStr);
  const tz = biz.timezone || 'UTC';
  const dayKey = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz }).toLowerCase();
  
  const hours = biz.working_hours?.[dayKey];
  if (!hours || !hours.active) return []; // closed
  
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  
  // 2. Fetch locked/booked slots from Firebase
  const locksSnap = await db.collection('slot_locks')
    .where('business_id', '==', businessId)
    .where('slot_date', '==', dateStr)
    .get();
    
  const bookingsSnap = await db.collection('bookings')
    .where('business_id', '==', businessId)
    .where('booking_date', '==', dateStr)
    .where('status', 'in', ['confirmed', 'pending'])
    .get();

  const unavailableTimes = new Set();
  
  // Add locks (that haven't expired)
  const now = new Date();
  locksSnap.forEach(doc => {
    const lock = doc.data();
    if (new Date(lock.expires_at) > now) {
      unavailableTimes.add(lock.start_time);
    }
  });
  
  // Add actual bookings
  bookingsSnap.forEach(doc => {
    unavailableTimes.add(doc.data().start_time);
  });

  // Generate 30-min slots
  const slots = [];
  let current = new Date(d);
  current.setHours(openH, openM, 0, 0);
  
  const end = new Date(d);
  end.setHours(closeH, closeM, 0, 0);
  
  while (current < end) {
    const timeStr = current.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    if (!unavailableTimes.has(timeStr)) {
      slots.push(timeStr);
    }
    current.setMinutes(current.getMinutes() + 30);
  }
  
  return slots;
}

/**
 * Attempt to acquire a lock on a slot using Firestore Transactions
 */
export async function lockSlot(businessId, dateStr, timeStr, callSid) {
  const lockId = `${businessId}_${dateStr}_${timeStr}`;
  const lockRef = db.collection('slot_locks').doc(lockId);
  
  try {
    const success = await db.runTransaction(async (t) => {
      // 1. Check if booked
      const bookingsSnap = await t.get(db.collection('bookings')
        .where('business_id', '==', businessId)
        .where('booking_date', '==', dateStr)
        .where('start_time', '==', timeStr)
        .where('status', 'in', ['confirmed', 'pending']));
        
      if (!bookingsSnap.empty) return false;

      // 2. Check if already locked by someone else
      const lockDoc = await t.get(lockRef);
      const now = new Date();
      if (lockDoc.exists) {
        const lock = lockDoc.data();
        if (new Date(lock.expires_at) > now && lock.call_sid !== callSid) {
          return false; // Locked by someone else and hasn't expired
        }
      }
      
      // 3. Acquire lock
      const expiresAt = new Date(now.getTime() + 5 * 60000).toISOString();
      t.set(lockRef, {
        business_id: businessId,
        slot_date: dateStr,
        start_time: timeStr,
        call_sid: callSid,
        expires_at: expiresAt,
        created_at: now.toISOString()
      });
      
      return true;
    });
    
    return success;
  } catch (err) {
    console.error('[Slot Lock Error]', err);
    return false;
  }
}

/**
 * Release locks held by a call
 */
export async function releaseSlotLock(callSid) {
  const snap = await db.collection('slot_locks').where('call_sid', '==', callSid).get();
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}
