import { useState, useEffect, useCallback } from 'react';
import { Phone, Clock, X, ChevronDown, ChevronUp, Play } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import { api, DEMO_BUSINESS_ID } from '../lib/api.js';
import { formatDateTime, formatDuration, formatPhone, getOutcomeBadge, getOutcomeLabel } from '../lib/utils.js';

const MOCK_CALLS = [
  { id: '1', caller_number: '+60112222333', started_at: new Date(Date.now() - 1800000).toISOString(), duration_sec: 87, outcome: 'booking_confirmed', customer_name: 'Ahmad Razif', booked_service: 'Haircut', transcript: [{ role: 'assistant', text: "Hi, you've reached Demo Barbershop! How can I help you today?" }, { role: 'user', text: "I'd like to book a haircut" }, { role: 'assistant', text: "Of course! We have openings at 2:00 PM or 4:00 PM today. Which works better for you?" }, { role: 'user', text: "2 PM is perfect" }, { role: 'assistant', text: "Great! Can I get your name and phone number?" }, { role: 'user', text: "Ahmad Razif, 0112222333" }, { role: 'assistant', text: "Perfect! You're all set. Haircut at 2:00 PM today. See you then!" }] },
  { id: '2', caller_number: '+60133334444', started_at: new Date(Date.now() - 3600000).toISOString(), duration_sec: 42, outcome: 'inquiry', transcript: [{ role: 'assistant', text: "Hi! How can I help you?" }, { role: 'user', text: "What are your opening hours?" }, { role: 'assistant', text: "We're open Monday to Friday 9 AM to 6 PM, and Saturday 10 AM to 4 PM. Sunday we're closed." }, { role: 'user', text: "Thank you!" }] },
  { id: '3', caller_number: '+60155556666', started_at: new Date(Date.now() - 7200000).toISOString(), duration_sec: 15, outcome: 'voicemail', transcript: [] },
  { id: '4', caller_number: '+60177778888', started_at: new Date(Date.now() - 86400000).toISOString(), duration_sec: 120, outcome: 'transferred', transcript: [{ role: 'assistant', text: "How can I help?" }, { role: 'user', text: "I need to speak to the owner about a complaint" }, { role: 'assistant', text: "I understand. Let me transfer you right away." }] },
  { id: '5', caller_number: '+60199990000', started_at: new Date(Date.now() - 172800000).toISOString(), duration_sec: 95, outcome: 'booking_confirmed', customer_name: 'Lee Wei Ming', booked_service: 'Beard Trim', transcript: [] },
];

export default function CallLogs({ business }) {
  const [calls, setCalls]       = useState(MOCK_CALLS);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.calls.list(DEMO_BUSINESS_ID, { limit: 30 });
      setCalls(data.length > 0 ? data : MOCK_CALLS);
    } catch (_) { setCalls(MOCK_CALLS); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id) => setExpanded(e => e === id ? null : id);

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Call Logs" subtitle="Every call, transcribed and stored" onRefresh={load} loading={loading} />

      <div className="p-6 flex-1 flex flex-col gap-4 animate-slide-up">
        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Calls', value: calls.length, color: 'text-white' },
            { label: 'Bookings', value: calls.filter(c => c.outcome === 'booking_confirmed').length, color: 'text-emerald-400' },
            { label: 'Inquiries', value: calls.filter(c => c.outcome === 'inquiry').length, color: 'text-blue-400' },
            { label: 'Voicemails', value: calls.filter(c => c.outcome === 'voicemail').length, color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card py-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Calls list */}
        <div className="card p-0 flex-1 overflow-auto">
          <div className="divide-y divide-surface-border">
            {calls.map(call => (
              <div key={call.id} className="hover:bg-surface-hover/30 transition-colors">
                {/* Call row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                  onClick={() => toggleExpand(call.id)}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${call.outcome === 'booking_confirmed' ? 'bg-emerald-900/40 text-emerald-400' :
                      call.outcome === 'voicemail' ? 'bg-amber-900/40 text-amber-400' :
                      'bg-surface-hover text-gray-400'}`}
                  >
                    <Phone size={16} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-mono text-sm font-medium text-white">{formatPhone(call.caller_number)}</p>
                      {call.customer_name && (
                        <span className="text-sm text-gray-400">— {call.customer_name}</span>
                      )}
                      <span className={getOutcomeBadge(call.outcome)}>{getOutcomeLabel(call.outcome)}</span>
                      {call.booked_service && (
                        <span className="text-xs text-brand-400">{call.booked_service}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{formatDateTime(call.started_at)}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {formatDuration(call.duration_sec)}
                      </span>
                      {call.transcript?.length > 0 && (
                        <span className="text-gray-600">{call.transcript.length} messages</span>
                      )}
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <div className="flex-shrink-0 text-gray-500">
                    {expanded === call.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Transcript */}
                {expanded === call.id && call.transcript?.length > 0 && (
                  <div className="px-5 pb-4 animate-fade-in">
                    <div className="border border-surface-border rounded-xl p-4 bg-surface/50 space-y-3 max-h-72 overflow-y-auto">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Conversation Transcript</p>
                      {call.transcript.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                          <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
                            ${msg.role === 'assistant' ? 'bg-brand-600/30 text-brand-400' : 'bg-gray-700 text-gray-300'}`}
                          >
                            {msg.role === 'assistant' ? 'AI' : 'C'}
                          </div>
                          <div className={`flex-1 px-3 py-2 rounded-xl text-sm
                            ${msg.role === 'assistant'
                              ? 'bg-brand-600/10 border border-brand-600/20 text-gray-200'
                              : 'bg-surface-hover border border-surface-border text-gray-300'}`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expanded === call.id && (!call.transcript || call.transcript.length === 0) && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-500 text-center py-3 border border-surface-border rounded-xl">
                      No transcript available for this call
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
