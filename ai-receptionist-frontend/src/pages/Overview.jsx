import { useState, useEffect, useCallback } from 'react';
import {
  PhoneCall, CalendarCheck, TrendingUp, Clock,
  Phone, ArrowUp, ArrowDown, Zap, Users
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import TopBar from '../components/TopBar.jsx';
import { api, DEMO_BUSINESS_ID } from '../lib/api.js';
import { formatDateTime, formatDuration, getOutcomeBadge, getOutcomeLabel } from '../lib/utils.js';
import WhatsAppAgent from '../components/WhatsAppAgent.jsx';

// ── Mock data for when backend is offline ─────────────────
const EMPTY_STATS = {
  total_calls: 0,
  bookings_made: 0,
  inquiries: 0,
  voicemails: 0,
  transfers: 0,
  avg_duration_sec: 0,
  booking_conversion_rate: '0',
};

const EMPTY_CHART = [];

// ── Stat Card ──────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, trend, color = 'brand' }) {
  const colors = {
    brand:   'from-brand-500/20 to-brand-600/10 border-brand-600/30 text-brand-400',
    green:   'from-emerald-500/20 to-emerald-600/10 border-emerald-600/30 text-emerald-400',
    purple:  'from-purple-500/20 to-purple-600/10 border-purple-600/30 text-purple-400',
    amber:   'from-amber-500/20 to-amber-600/10 border-amber-600/30 text-amber-400',
  };

  return (
    <div className={`card bg-gradient-to-br ${colors[color]} border animate-fade-in`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-black/20`}>
          <Icon size={20} className="opacity-90" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          {trend >= 0
            ? <ArrowUp size={12} className="text-emerald-400" />
            : <ArrowDown size={12} className="text-red-400" />}
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {Math.abs(trend)}% vs last week
          </span>
        </div>
      )}
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function Overview({ business }) {
  const [stats, setStats]       = useState(EMPTY_STATS);
  const [bookings, setBookings] = useState([]);
  const [calls, setCalls]       = useState([]);
  const [chartData, setChartData] = useState(EMPTY_CHART);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b, c] = await Promise.all([
        api.calls.stats(DEMO_BUSINESS_ID, 7),
        api.bookings.list(DEMO_BUSINESS_ID, { date: new Date().toISOString().split('T')[0], limit: 5 }),
        api.calls.list(DEMO_BUSINESS_ID, { limit: 5 }),
      ]);
      setStats(s || EMPTY_STATS);
      setBookings(b || []);
      setCalls(c || []);
      // Ideally fetch chart data from API as well, using EMPTY_CHART for now
      setChartData(EMPTY_CHART);
    } catch (err) {
      console.error("Failed to load overview data:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const conversion = parseFloat(stats.booking_conversion_rate || 0);

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Overview"
        subtitle={`Welcome back${business ? `, ${business.name}` : ''}`}
        onRefresh={load}
        loading={loading}
      />

      <div className="p-6 space-y-6 flex-1 animate-slide-up">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={PhoneCall} color="brand"
            label="Calls This Week" value={stats.total_calls}
            sub="100% answer rate" trend={12}
          />
          <StatCard
            icon={CalendarCheck} color="green"
            label="Bookings Made" value={stats.bookings_made}
            sub={`${conversion}% conversion`} trend={8}
          />
          <StatCard
            icon={TrendingUp} color="purple"
            label="Conversion Rate" value={`${conversion}%`}
            sub="Booking / intent calls" trend={3}
          />
          <StatCard
            icon={Clock} color="amber"
            label="Avg Call Duration" value={formatDuration(stats.avg_duration_sec)}
            sub="Target: <90s" trend={-5}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Area chart */}
          <div className="card xl:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-white">Calls & Bookings</h3>
                <p className="text-sm text-gray-500 mt-0.5">Last 7 days</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-brand-400"><span className="w-3 h-0.5 rounded bg-brand-400 inline-block" /> Calls</span>
                <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-3 h-0.5 rounded bg-emerald-400 inline-block" /> Bookings</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#3a62f8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3a62f8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#232b3e" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="calls"    stroke="#3a62f8" strokeWidth={2} fill="url(#gradCalls)"    name="Calls" />
                <Area type="monotone" dataKey="bookings" stroke="#10b981" strokeWidth={2} fill="url(#gradBookings)" name="Bookings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Outcome breakdown */}
          <div className="card">
            <h3 className="font-semibold text-white mb-5">Call Outcomes</h3>
            <div className="space-y-3">
              {[
                { label: 'Bookings',   val: stats.bookings_made,  color: 'bg-brand-500',  pct: Math.round(stats.bookings_made / stats.total_calls * 100) },
                { label: 'Inquiries',  val: stats.inquiries,      color: 'bg-purple-500', pct: Math.round(stats.inquiries    / stats.total_calls * 100) },
                { label: 'Voicemail',  val: stats.voicemails,     color: 'bg-amber-500',  pct: Math.round(stats.voicemails   / stats.total_calls * 100) },
                { label: 'Transfers',  val: stats.transfers,      color: 'bg-red-500',    pct: Math.round(stats.transfers    / stats.total_calls * 100) },
              ].map(({ label, val, color, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-medium">{val} <span className="text-gray-500 font-normal text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's bookings + recent calls */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Today's bookings */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Today's Bookings</h3>
              <span className="badge badge-green">{bookings.length} upcoming</span>
            </div>
            <div className="space-y-2">
              {bookings.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">No bookings today yet</p>
              )}
              {bookings.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-hover border border-surface-border hover:border-brand-600/30 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400">
                    {b.customer_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{b.customer_name}</p>
                    <p className="text-xs text-gray-500">{b.service_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-brand-400">
                      {new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                    <span className="badge badge-green text-[10px]">Confirmed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent calls */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Recent Calls</h3>
              <Zap size={14} className="text-brand-400" />
            </div>
            <div className="space-y-2">
              {calls.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-hover border border-surface-border">
                  <div className="w-8 h-8 rounded-lg bg-surface-border flex items-center justify-center">
                    <Phone size={14} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white font-mono">{c.caller_number}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(c.started_at)}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className={getOutcomeBadge(c.outcome)}>{getOutcomeLabel(c.outcome)}</span>
                    <p className="text-xs text-gray-500">{formatDuration(c.duration_sec)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Agent */}
          <div className="h-full">
            <WhatsAppAgent />
          </div>
        </div>
      </div>
    </div>
  );
}
