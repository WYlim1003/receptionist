import { useState, useEffect, useCallback } from 'react';
import { Plus, Lock, CheckCircle, XCircle, Calendar, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import { api, DEMO_BUSINESS_ID } from '../lib/api.js';
import { formatTime } from '../lib/utils.js';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';

const STATUS_STYLES = {
  open:    { bar: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400', label: 'Open' },
  booked:  { bar: 'bg-brand-500/20 border-brand-500/30 text-brand-400', label: 'Booked' },
  locked:  { bar: 'bg-amber-500/20 border-amber-500/30 text-amber-400', label: 'Locked' },
  blocked: { bar: 'bg-red-500/10 border-red-500/20 text-red-500', label: 'Blocked' },
};

const MOCK_SLOTS = [];

export default function Slots({ business, isEmbedded = false }) {
  const [slots, setSlots]     = useState(MOCK_SLOTS);
  const [autoBookedSlots, setAutoBookedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [generating, setGenerating]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDay, 'yyyy-MM-dd');
      let data = [];
      try {
        data = await api.slots.list(DEMO_BUSINESS_ID, dateStr);
      } catch (e) {}
      
      const apiSlots = data.length > 0 ? data : [];
      const manualSlots = autoBookedSlots.filter(s => format(new Date(s.start_time), 'yyyy-MM-dd') === dateStr);
      
      setSlots([...apiSlots, ...manualSlots]);
    } catch (_) { 
      setSlots([]);
    }
    setLoading(false);
  }, [selectedDay, autoBookedSlots]);

  useEffect(() => { load(); }, [load]);

  // Listen for auto-booking events from the ReplyAgent
  useEffect(() => {
    const handleAutoBook = (e) => {
      const { start_time, end_time, customer_name, service_name } = e.detail;
      const newSlot = {
        id: `auto-${Date.now()}`,
        start_time,
        end_time,
        status: 'booked',
        customer_name: customer_name || 'Customer',
        service_name: service_name || 'Auto Booking',
        booking_id: `booking-${Date.now()}`
      };
      
      setAutoBookedSlots(prev => [...prev, newSlot]);
      
      // Auto-navigate the calendar to the booked date to show the slot immediately
      const bookedDate = new Date(start_time);
      setSelectedDay(bookedDate);
      setWeekStart(startOfWeek(bookedDate, { weekStartsOn: 1 }));
    };
    window.addEventListener('auto-book', handleAutoBook);
    return () => window.removeEventListener('auto-book', handleAutoBook);
  }, []);

  const handleBlock = async (slot) => {
    if (slot.status !== 'open') return;
    try {
      await api.slots.block({ businessId: DEMO_BUSINESS_ID, slotId: slot.id });
      setSlots(s => s.map(x => x.id === slot.id ? { ...x, status: 'blocked' } : x));
    } catch (_) {
      setSlots(s => s.map(x => x.id === slot.id ? { ...x, status: 'blocked' } : x));
    }
  };

  const handleUnblock = async (slot) => {
    if (slot.status !== 'blocked') return;
    try {
      await api.slots.unblock({ businessId: DEMO_BUSINESS_ID, slotId: slot.id });
      setSlots(s => s.map(x => x.id === slot.id ? { ...x, status: 'open' } : x));
    } catch (_) {
      setSlots(s => s.map(x => x.id === slot.id ? { ...x, status: 'open' } : x));
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const from = format(weekStart, 'yyyy-MM-dd');
    const to   = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    try {
      await api.slots.generate({ businessId: DEMO_BUSINESS_ID, fromDate: from, toDate: to });
      await load();
    } catch (_) {}
    setGenerating(false);
  };

  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const summary = {
    open:    slots.filter(s => s.status === 'open').length,
    booked:  slots.filter(s => s.status === 'booked').length,
    blocked: slots.filter(s => s.status === 'blocked').length,
    locked:  slots.filter(s => s.status === 'locked').length,
  };

  return (
    <div className={`flex flex-col flex-1 ${isEmbedded ? '' : ''}`}>
      {!isEmbedded && <TopBar title="Slot Manager" subtitle="View and manage available time slots" onRefresh={load} loading={loading} />}

      <div className="p-6 flex-1 flex flex-col gap-4 animate-slide-up">
        {/* Week navigator */}
        <div className="card flex items-center gap-4">
          <button onClick={() => setWeekStart(w => addDays(w, -7))} className="btn-ghost">
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1 flex gap-2 overflow-x-auto">
            {weekDays.map(day => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`flex-1 flex flex-col items-center py-2 px-3 rounded-xl transition-all min-w-[60px]
                  ${format(day, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd')
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/30'
                    : isToday(day)
                      ? 'border border-brand-600/50 text-brand-400'
                      : 'hover:bg-surface-hover text-gray-400 hover:text-white'
                  }`}
              >
                <span className="text-xs font-medium">{format(day, 'EEE')}</span>
                <span className="text-lg font-bold">{format(day, 'd')}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} className="btn-ghost">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Slot grid */}
        <div className="card p-0 flex-1 overflow-auto">
          <div className="p-4 border-b border-surface-border">
            <h3 className="font-semibold text-white">
              {isToday(selectedDay) ? "Today's Slots" : format(selectedDay, 'EEEE, MMMM d')}
            </h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {slots.length === 0 && (
              <div className="col-span-full text-center py-16 text-gray-500">
                <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                <p>No slots for this day</p>
                <p className="text-xs mt-1">Click "Generate Week" to create slots from your schedule</p>
              </div>
            )}
            {slots.map(slot => {
              const s = STATUS_STYLES[slot.status] || STATUS_STYLES.open;
              return (
                <div
                  key={slot.id}
                  className={`p-3 rounded-xl border transition-all ${s.bar} ${slot.status === 'open' ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{slot.service_name || 'Any service'}</p>
                    </div>
                    <span className={`badge ${s.bar} text-[10px]`}>{s.label}</span>
                  </div>

                  {slot.customer_name && (
                    <p className="text-xs text-white font-medium mt-2 pt-2 border-t border-white/10">
                      👤 {slot.customer_name}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-2">
                    {slot.status === 'open' && (
                      <button
                        onClick={() => handleBlock(slot)}
                        className="flex-1 text-xs py-1 rounded-lg bg-black/20 hover:bg-black/40 text-gray-400 hover:text-white transition-colors"
                      >
                        Block
                      </button>
                    )}
                    {slot.status === 'blocked' && (
                      <button
                        onClick={() => handleUnblock(slot)}
                        className="flex-1 text-xs py-1 rounded-lg bg-black/20 hover:bg-black/40 text-emerald-400 transition-colors"
                      >
                        Unblock
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
