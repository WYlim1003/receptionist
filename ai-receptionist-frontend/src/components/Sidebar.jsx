import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Clock, PhoneCall,
  Settings, Mic2, ChevronRight, Zap, Activity
} from 'lucide-react';

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Overview' }
];

export default function Sidebar({ business }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface-card border-r border-surface-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-900/40">
            <Mic2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">VoiceDesk</h1>
            <p className="text-[11px] text-gray-500">AI Receptionist</p>
          </div>
        </div>
      </div>

      {/* Business pill */}
      {business && (
        <div className="mx-4 mt-4 px-3 py-2.5 bg-surface-hover rounded-xl border border-surface-border">
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Business</p>
          <p className="text-sm font-semibold text-white truncate">{business.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="live-dot" />
            <span className="text-[11px] text-emerald-400">Live</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
          >
            <Icon size={17} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-30" />
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-surface-border">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-600/10 border border-brand-600/20">
          <Zap size={14} className="text-brand-400" />
          <div>
            <p className="text-[11px] font-semibold text-brand-300">Starter Plan</p>
            <p className="text-[10px] text-gray-500">100 calls / month</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
