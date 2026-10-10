import { db } from '../db/pool.js';
import { getAvailableSlots, lockSlot } from './slotService.js';

export async function checkSlots({ date }, business) {
  const slots = await getAvailableSlots(business.id, date);
  return { date, available_slots: slots };
}

export async function createBooking(args, business, callSid) {
  const { date, time, customer_name, service } = args;

  // 1. Acquire lock
  const locked = await lockSlot(business.id, date, time, callSid);
  if (!locked) {
    return { success: false, error: 'Slot is no longer available. Please choose another time.' };
  }

  // 2. Insert booking
  const data = {
    business_id: business.id,
    customer_name,
    service,
    booking_date: date,
    start_time: time,
    status: 'confirmed',
    call_sid: callSid,
    created_at: new Date().toISOString()
  };

  const docRef = await db.collection('bookings').add(data);
  return { success: true, bookingId: docRef.id, startTime: time, date, service };
}

export function getBusinessInfo(args, business) {
  // Simple extraction based on the knowledge base or working hours
  return {
    name: business.name,
    address: business.address,
    working_hours: business.working_hours,
    faq: business.knowledge_base
  };
}

export function transferCall({ reason }) {
  // Signals the orchestration engine to initiate a Twilio dial transfer
  return { success: true, action: 'TRANSFER_INITIATED', reason };
}
