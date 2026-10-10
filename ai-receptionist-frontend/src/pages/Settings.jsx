import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Phone, MapPin, Clock, Mic2, Languages, AlertCircle, CheckCircle } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import { api, DEMO_BUSINESS_ID } from '../lib/api.js';

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-surface-border">
        <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center">
          <Icon size={16} className="text-brand-400" />
        </div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function Settings({ business, setBusiness }) {
  const [form, setForm]       = useState(business || {});
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [newService, setNewService] = useState({ name: '', duration_min: 30, price: '' });

  // Update form when business prop loads (e.g. from mock fetch)
  useEffect(() => {
    if (business && !form.name) {
      setForm(business);
    }
  }, [business]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const updateHours = (day, field, value) => {
    setForm(f => ({
      ...f,
      working_hours: {
        ...f.working_hours,
        [day]: { ...f.working_hours?.[day], [field]: value },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.businesses.update(DEMO_BUSINESS_ID, {
        name: form.name,
        address: form.address,
        greeting_text: form.greeting_text,
        knowledge_base: form.knowledge_base,
        timezone: form.timezone,
        language: form.language,
        owner_phone: form.owner_phone,
        working_hours: form.working_hours,
      });
      setBusiness(updated);
      showToast('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings', 'error');
    }
    setSaving(false);
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.duration_min) return;
    try {
      await api.businesses.addService(DEMO_BUSINESS_ID, newService);
      showToast(`Service "${newService.name}" added`);
      setNewService({ name: '', duration_min: 30, price: '' });
      const updated = await api.businesses.get(DEMO_BUSINESS_ID);
      setBusiness(updated);
      setForm(updated);
    } catch (err) {
      console.error(err);
      showToast('Failed to add service', 'error');
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!confirm('Remove this service?')) return;
    try {
      await api.businesses.deleteService(DEMO_BUSINESS_ID, serviceId);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete service', 'error');
    }
  };

  if (!form.name) {
    return (
      <div className="flex flex-col flex-1">
        <TopBar title="Settings" />
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading business profile...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title="Settings"
        subtitle="Configure your AI receptionist"
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-slide-up
          ${toast.type === 'success' ? 'bg-emerald-900/80 border-emerald-700 text-emerald-300' : 'bg-amber-900/80 border-amber-700 text-amber-300'}`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="p-6 flex-1 overflow-auto space-y-5 animate-slide-up">
        {/* Business Info */}
        <Section title="Business Profile" icon={MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="biz-name">Business Name</label>
              <input id="biz-name" className="input" value={form.name || ''} onChange={e => update('name', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="biz-type">Business Type</label>
              <input id="biz-type" className="input" placeholder="e.g. barbershop, salon, clinic" value={form.business_type || ''} onChange={e => update('business_type', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="biz-address">Address</label>
              <input id="biz-address" className="input" value={form.address || ''} onChange={e => update('address', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="owner-phone">Owner Phone (for transfers & alerts)</label>
              <input id="owner-phone" className="input" placeholder="+60..." value={form.owner_phone || ''} onChange={e => update('owner_phone', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="biz-timezone">Timezone</label>
              <select id="biz-timezone" className="input" value={form.timezone || 'Asia/Kuala_Lumpur'} onChange={e => update('timezone', e.target.value)}>
                <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (MYT)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (ICT)</option>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="America/New_York">America/New_York (ET)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
          </div>
        </Section>

        {/* AI Knowledge Base (Cleve AI approach) */}
        <Section title="AI Knowledge Base" icon={Mic2}>
          <div>
            <label className="label" htmlFor="knowledge_base">Business Knowledge & FAQs</label>
            <textarea
              id="knowledge_base"
              className="input min-h-[120px] resize-y"
              placeholder="Like Cleve AI, add notes, FAQs, parking info, payment methods, or policies here. The AI will remember this and use it to answer customer questions."
              value={form.knowledge_base || ''}
              onChange={e => update('knowledge_base', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1.5">This acts as a memory bank for your AI Receptionist.</p>
          </div>
        </Section>

        {/* AI Greeting */}
        <Section title="AI Receptionist" icon={Mic2}>
          <div>
            <label className="label" htmlFor="greeting">Custom Greeting</label>
            <textarea
              id="greeting"
              className="input min-h-[80px] resize-y"
              placeholder={`Hi, you've reached ${form.name}! How can I help you today?`}
              value={form.greeting_text || ''}
              onChange={e => update('greeting_text', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1.5">Leave blank to use the default greeting.</p>
          </div>
          <div>
            <label className="label" htmlFor="language">Default Language</label>
            <select id="language" className="input w-48" value={form.language || 'en'} onChange={e => update('language', e.target.value)}>
              <option value="en">English</option>
              <option value="ms">Bahasa Malaysia</option>
              <option value="zh">Chinese (Mandarin)</option>
              <option value="ta">Tamil</option>
              <option value="id">Indonesian</option>
            </select>
            <p className="text-xs text-gray-500 mt-1.5">The AI will auto-detect and switch if the caller speaks another language.</p>
          </div>
        </Section>

        {/* Working Hours */}
        <Section title="Working Hours" icon={Clock}>
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const h = form.working_hours?.[key] || { open: '09:00', close: '18:00', active: false };
              return (
                <div key={key} className="flex items-center gap-3 py-2">
                  <div className="w-28">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div
                        className={`relative w-9 h-5 rounded-full transition-colors ${h.active ? 'bg-brand-600' : 'bg-surface-border'}`}
                        onClick={() => updateHours(key, 'active', !h.active)}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${h.active ? 'translate-x-4' : ''}`} />
                      </div>
                      <span className={`text-sm font-medium ${h.active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                    </label>
                  </div>
                  {h.active ? (
                    <div className="flex items-center gap-2">
                      <input type="time" className="input w-32 py-1.5" value={h.open || '09:00'} onChange={e => updateHours(key, 'open', e.target.value)} />
                      <span className="text-gray-500 text-sm">to</span>
                      <input type="time" className="input w-32 py-1.5" value={h.close || '18:00'} onChange={e => updateHours(key, 'close', e.target.value)} />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-600">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* Services */}
        <Section title="Service Catalog" icon={Phone}>
          <div className="space-y-2">
            {form.services?.filter(s => s.is_active !== false).map(service => (
              <div key={service.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-hover border border-surface-border">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{service.name}</p>
                  <p className="text-xs text-gray-500">{service.duration_min} min · RM{service.price || '—'}</p>
                </div>
                <button onClick={() => handleDeleteService(service.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add new service */}
          <div className="pt-3 border-t border-surface-border">
            <p className="text-sm font-medium text-gray-400 mb-3">Add New Service</p>
            <div className="flex gap-2 flex-wrap">
              <input
                id="new-service-name"
                className="input flex-1 min-w-32"
                placeholder="Service name"
                value={newService.name}
                onChange={e => setNewService(s => ({ ...s, name: e.target.value }))}
              />
              <input
                id="new-service-duration"
                type="number"
                className="input w-24"
                placeholder="Min"
                value={newService.duration_min}
                onChange={e => setNewService(s => ({ ...s, duration_min: parseInt(e.target.value) || 30 }))}
              />
              <input
                id="new-service-price"
                type="number"
                className="input w-24"
                placeholder="RM price"
                value={newService.price}
                onChange={e => setNewService(s => ({ ...s, price: e.target.value }))}
              />
              <button onClick={handleAddService} className="btn-primary">
                <Plus size={15} /> Add
              </button>
            </div>
          </div>
        </Section>

        {/* Save button */}
        <div className="flex justify-end pb-6">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3 text-base shadow-xl shadow-brand-900/30">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
