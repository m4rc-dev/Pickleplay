import React from 'react';
import { CalendarDays, LayoutDashboard, MapPin, ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { COURT_MANAGER_NAV_ITEMS } from '../../lib/court-manager/constants';

const iconMap = {
  overview: LayoutDashboard,
  'assigned-court': MapPin,
  bookings: CalendarDays,
  schedule: ShieldCheck,
} as const;

interface CourtManagerSidebarProps {
  courtName?: string;
}

const CourtManagerSidebar: React.FC<CourtManagerSidebarProps> = ({ courtName }) => (
  <aside className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm">
    <div className="rounded-[24px] bg-slate-950 px-5 py-4 text-white">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">
        Court Manager Mode
      </p>
      <p className="mt-2 text-lg font-black uppercase tracking-tight">
        {courtName || 'Assigned Court'}
      </p>
      <p className="mt-2 text-xs font-medium text-white/70">
        Your access stays scoped to this single court and its day-to-day operations.
      </p>
    </div>

    <nav className="mt-4 space-y-2">
      {COURT_MANAGER_NAV_ITEMS.map((item) => {
        const Icon = iconMap[item.section];
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.section === 'overview'}
            className={({ isActive }) =>
              `flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all ${
                isActive
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'
              }`
            }
          >
            <div className="mt-0.5 rounded-xl bg-white p-2 shadow-sm">
              <Icon size={16} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em]">
                {item.label}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {item.description}
              </p>
            </div>
          </NavLink>
        );
      })}
    </nav>
  </aside>
);

export default CourtManagerSidebar;
