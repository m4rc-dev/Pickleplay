import React from 'react';
import { CalendarDays, LayoutDashboard, MapPin, ShieldCheck, CalendarRange, List, Sun } from 'lucide-react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { COURT_MANAGER_NAV_ITEMS, COURT_MANAGER_ROUTES } from '../../lib/court-manager/constants';

const iconMap = {
  overview: LayoutDashboard,
  'assigned-court': MapPin,
  bookings: CalendarDays,
  schedule: ShieldCheck,
} as const;

const VIEW_OPTIONS = [
  { key: 'calendar' as const, label: 'Month', icon: CalendarRange },
  { key: 'day' as const, label: 'Day', icon: Sun },
  { key: 'list' as const, label: 'List', icon: List },
];

interface CourtManagerSidebarProps {
  courtName?: string;
}

const CourtManagerSidebar: React.FC<CourtManagerSidebarProps> = ({ courtName }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isOnBookings = location.pathname === COURT_MANAGER_ROUTES.bookings;
  const currentView = (searchParams.get('view') as 'calendar' | 'day' | 'list') || 'calendar';

  const handleViewChange = (view: 'calendar' | 'day' | 'list') => {
    setSearchParams(params => {
      params.set('view', view);
      return params;
    });
  };

  return (
    <aside
      data-owner-surface="secondary"
      className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-white via-white to-blue-50 p-5 shadow-sm"
    >
      <div className="rounded-[24px] border border-emerald-200 bg-gradient-to-r from-emerald-50 via-lime-50 to-white px-5 py-4 text-slate-900 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
          Court Manager Mode
        </p>
        <p className="mt-2 text-lg font-black uppercase tracking-tight">
          {courtName || 'Assigned Court'}
        </p>
        <p className="mt-2 text-xs font-medium text-slate-500">
          Your access stays scoped to this single court and its day-to-day operations.
        </p>
      </div>

      <nav className="mt-4 space-y-2">
        {COURT_MANAGER_NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.section];
          const isBookingsItem = item.section === 'bookings';
          return (
            <React.Fragment key={item.href}>
              <NavLink
                to={item.href}
                end={item.section === 'overview'}
                className={({ isActive }) =>
                  `flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all ${
                    isActive
                      ? 'border-[#C5E8D8] bg-[#EBF7F0] text-[#16784D] shadow-sm'
                      : 'border-slate-100 bg-slate-50/90 text-slate-600 hover:border-[#C5E8D8] hover:bg-white hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`mt-0.5 rounded-xl p-2 shadow-sm ${
                        isActive ? 'bg-[#D5F0E3] text-[#16784D]' : 'bg-white text-slate-600'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em]">
                        {item.label}
                      </p>
                      <p className={`mt-1 text-xs font-medium ${isActive ? 'text-[#16784D]/70' : 'text-slate-500'}`}>
                        {item.description}
                      </p>
                    </div>
                  </>
                )}
              </NavLink>

              {/* View toggle sub-nav — only shown under Court Bookings when on that page */}
              {isBookingsItem && isOnBookings && (
                <div className="ml-3 pl-3 border-l-2 border-[#C5E8D8] space-y-1 pb-1 animate-in slide-in-from-top-2 fade-in duration-200">
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#16784D]/60 px-2 pt-1 pb-0.5">
                    View
                  </p>
                  {VIEW_OPTIONS.map(({ key, label, icon: ViewIcon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleViewChange(key)}
                      className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all duration-200 ${
                        currentView === key
                          ? 'bg-[#16784D] text-white shadow-sm'
                          : 'text-slate-500 hover:bg-[#EBF7F0] hover:text-[#16784D]'
                      }`}
                    >
                      <ViewIcon size={13} className="shrink-0" />
                      <span className="text-[11px] font-black uppercase tracking-[0.18em]">{label}</span>
                      {currentView === key && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
};

export default CourtManagerSidebar;
