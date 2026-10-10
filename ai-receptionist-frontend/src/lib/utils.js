import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';

export function formatTime(dateStr) {
  if (!dateStr) return '—';
  return format(parseISO(dateStr), 'h:mm a');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d · h:mm a');
}

export function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatPhone(phone) {
  if (!phone) return '—';
  // Format Malaysian / international numbers
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('60')) {
    return `+60 ${cleaned.slice(2, 4)}-${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

export function getBookingStatusBadge(status) {
  const map = {
    confirmed:   'badge-green',
    cancelled:   'badge-red',
    completed:   'badge-blue',
    no_show:     'badge-yellow',
    rescheduled: 'badge-purple',
  };
  return map[status] || 'badge-gray';
}

export function getOutcomeBadge(outcome) {
  const map = {
    booking_confirmed: 'badge-green',
    inquiry:           'badge-blue',
    voicemail:         'badge-yellow',
    transferred:       'badge-purple',
    out_of_hours:      'badge-gray',
    failed:            'badge-red',
    spam:              'badge-red',
  };
  return map[outcome] || 'badge-gray';
}

export function getOutcomeLabel(outcome) {
  const map = {
    booking_confirmed: 'Booked',
    inquiry:           'Inquiry',
    voicemail:         'Voicemail',
    transferred:       'Transferred',
    out_of_hours:      'After Hours',
    failed:            'Failed',
    spam:              'Spam',
    in_progress:       'Active',
  };
  return map[outcome] || outcome || '—';
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
