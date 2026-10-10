// API client for the backend
const BASE_URL = import.meta.env.VITE_API_URL || '';

// Demo business ID (matches the seed data)
export const DEMO_BUSINESS_ID = 'a0000000-0000-0000-0000-000000000001';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json();
}

// ── Bookings ───────────────────────────────────────────────
export const api = {
  bookings: {
    list: (businessId, params = {}) => {
      const qs = new URLSearchParams({ businessId, ...params }).toString();
      return apiFetch(`/api/bookings?${qs}`);
    },
    get: (id) => apiFetch(`/api/bookings/${id}`),
    create: (data) => apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/api/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/api/bookings/${id}`, { method: 'DELETE' }),
  },

  slots: {
    list: (businessId, date, serviceId) => {
      const qs = new URLSearchParams({ businessId, date, ...(serviceId ? { serviceId } : {}) }).toString();
      return apiFetch(`/api/slots?${qs}`);
    },
    range: (businessId, from, to) => {
      const qs = new URLSearchParams({ businessId, from, to }).toString();
      return apiFetch(`/api/slots/range?${qs}`);
    },
    generate: (data) => apiFetch('/api/slots/generate', { method: 'POST', body: JSON.stringify(data) }),
    block: (data) => apiFetch('/api/slots/block', { method: 'POST', body: JSON.stringify(data) }),
    unblock: (data) => apiFetch('/api/slots/unblock', { method: 'POST', body: JSON.stringify(data) }),
  },

  businesses: {
    get: (id) => apiFetch(`/api/businesses/${id}`),
    update: (id, data) => apiFetch(`/api/businesses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addService: (id, data) => apiFetch(`/api/businesses/${id}/services`, { method: 'POST', body: JSON.stringify(data) }),
    updateService: (id, serviceId, data) => apiFetch(`/api/businesses/${id}/services/${serviceId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteService: (id, serviceId) => apiFetch(`/api/businesses/${id}/services/${serviceId}`, { method: 'DELETE' }),
  },

  calls: {
    list: (businessId, params = {}) => {
      const qs = new URLSearchParams({ businessId, ...params }).toString();
      return apiFetch(`/api/calls?${qs}`);
    },
    get: (id) => apiFetch(`/api/calls/${id}`),
    stats: (businessId, days = 30) => apiFetch(`/api/calls/stats/${businessId}?days=${days}`),
  },
};
