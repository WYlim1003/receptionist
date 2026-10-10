import { Bell, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function TopBar({ title, subtitle, onRefresh, loading }) {
  return (
    <header className="sticky top-0 z-30 bg-surface/80 glass border-b border-surface-border px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
          <span className="live-dot" />
          <span>{format(new Date(), 'EEEE, MMM d · h:mm a')}</span>
        </div>

        {/* Refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-ghost"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        )}

        {/* Notifications */}
        <button className="btn-ghost relative">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500" />
        </button>
      </div>
    </header>
  );
}
