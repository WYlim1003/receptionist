import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Filter, Calendar, X, Check } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import { api, DEMO_BUSINESS_ID } from '../lib/api.js';
import { formatTime, formatDate, formatPhone, getBookingStatusBadge } from '../lib/utils.js';

const MOCK_BOOKINGS = [
  { id: '1', customer_name: 'Ahmad Razif', customer_phone: '+60112345678', service_name: 'Haircut', start_time: new Date(Date.now() + 3600000).toISOString(), end_time: new Date(Date.now() + 5400000).toISOString(), status: 'confirmed', duration_min: 30, price: 25 },
  { id: '2', customer_name: 'Lee Wei Ming', customer_phone: '+60198765432', service_name: 'Beard Trim', start_time: new Date(Date.now() + 7200000).toISOString(), end_time: new Date(Date.now() + 8400000).toISOString(), status: 'confirmed', duration_min: 20, price: 15 },
  { id: '3', customer_name: 'Muthu Raj', customer_phone: '+60161234567', service_name: 'Hot Towel Shave', start_time: new Date(Date.now() + 10800000).toISOString(), end_time: new Date(Date.now() + 12600000).toISOString(), status: 'confirmed', duration_min: 30, price: 30 },
  { id: '4', customer_name: 'Zara Hassan', customer_phone: '+60171112222', service_name: 'Haircut + Beard Trim', start_time: new Date(Date.now() - 7200000).toISOString(), end_time: new Date(Date.now() - 4500000).toISOString(), status: 'completed', duration_min: 45, price: 35 },
  { id: '5', customer_name: 'David Tan', customer_phone: '+60163334444', service_name: 'Haircut', start_time: new Date(Date.now() - 10800000).toISOString(), end_time: new Date(Date.now() - 9000000).toISOString(), status: 'no_show', duration_min: 30, price: 25 },
];

const STATUS_OPTIONS = ['all', 'confirmed', 'completed', 'cancelled', 'no_show'];

function StatusBadge({ status }) {
  const labels = { confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show', rescheduled: 'Rescheduled' };
  return <span className={getBookingStatusBadge(status)}>{labels[status] || status}</span>;
}

export default function Bookings({ business }) {
  const [bookings, setBookings]         = useState(MOCK_BOOKINGS);
  const [loading, setLoading]           = useState(false);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter]     = useState(new Date().toISOString().split('T')[0]);
  const [selected, setSelected]         = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      const data = await api.bookings.list(DEMO_BUSINESS_ID, params);
      setBookings(data);
    } catch (_) { setBookings(MOCK_BOOKINGS); }
    setLoading(false);
  }, [statusFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await api.bookings.update(id, { status: 'cancelled' });
      setBookings(bks => bks.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'cancelled' }));
    } catch (err) {
      alert('Failed to cancel: ' + err.message);
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.bookings.update(id, { status: 'completed' });
      setBookings(bks => bks.map(b => b.id === id ? { ...b, status: 'completed' } : b));
    } catch (_) {}
  };

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    return !q || b.customer_name?.toLowerCase().includes(q) || b.customer_phone?.includes(q) || b.service_name?.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Bookings" subtitle="Manage all appointments" onRefresh={load} loading={loading} />

      <div className="p-6 flex-1 flex flex-col gap-4 animate-slide-up">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="booking-search"
              className="input pl-9"
              placeholder="Search customer, service..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <input
            id="booking-date-filter"
            type="date"
            className="input w-44"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
          <div className="flex gap-1">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? 'btn-primary py-2 text-xs' : 'btn-secondary py-2 text-xs'}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card flex-1 overflow-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-border">
              <tr>
                {['Customer', 'Service', 'Date & Time', 'Duration', 'Price', 'Status', 'Actions'].map(h => (
                  <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-500">
                    No bookings found
                  </td>
                </tr>
              )}
              {filtered.map(b => (
                <tr
                  key={b.id}
                  className="table-row cursor-pointer"
                  onClick={() => setSelected(b)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400">
                        {b.customer_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{b.customer_name}</p>
                        <p className="text-xs text-gray-500 font-mono">{formatPhone(b.customer_phone)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{b.service_name}</td>
                  <td className="px-4 py-3">
                    <p className="text-white">{formatDate(b.start_time)}</p>
                    <p className="text-xs text-gray-500">{formatTime(b.start_time)}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{b.duration_min}m</td>
                  <td className="px-4 py-3 text-gray-300">RM{b.price || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      {b.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleComplete(b.id)}
                            className="p-1.5 rounded-lg hover:bg-emerald-900/30 text-emerald-400 transition-colors"
                            title="Mark complete"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="p-1.5 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors"
                            title="Cancel"
                          >
                            <X size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="card w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Booking Details</h3>
              <button onClick={() => setSelected(null)} className="btn-ghost p-1"><X size={16} /></button>
            </div>

            <div className="space-y-3 text-sm">
              {[
                { label: 'Customer', value: selected.customer_name },
                { label: 'Phone', value: formatPhone(selected.customer_phone) },
                { label: 'Service', value: selected.service_name },
                { label: 'Date', value: formatDate(selected.start_time) },
                { label: 'Time', value: `${formatTime(selected.start_time)} – ${formatTime(selected.end_time)}` },
                { label: 'Price', value: `RM${selected.price || '—'}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <StatusBadge status={selected.status} />
              </div>
            </div>

            {selected.status === 'confirmed' && (
              <div className="flex gap-2 mt-5 pt-4 border-t border-surface-border">
                <button onClick={() => { handleComplete(selected.id); setSelected(null); }} className="btn-primary flex-1 justify-center">
                  <Check size={14} /> Mark Complete
                </button>
                <button onClick={() => handleCancel(selected.id)} className="btn-danger flex-1 justify-center">
                  <X size={14} /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
