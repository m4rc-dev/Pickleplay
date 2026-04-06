import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react';
import CourtManagerHeader from '../CourtManagerHeader';
import CourtManagerStats from '../CourtManagerStats';
import ManagerEmptyState from '../ManagerEmptyState';
import ManagerStatusBanner from '../ManagerStatusBanner';
import { useCourtManagerLayoutContext } from '../CourtManagerLayout';
import { COURT_MANAGER_ROUTES } from '../../../lib/court-manager/constants';
import { getCourtManagerOverviewSummary } from '../../../lib/court-manager/queries';
import type { CourtManagerSummary } from '../../../types/court-manager';

const quickActions = [
  {
    href: COURT_MANAGER_ROUTES.bookings,
    label: 'Open Bookings',
    eyebrow: 'Court Bookings',
    description: 'Check in players, confirm unpaid requests, and keep booking flow moving.',
    icon: CalendarDays,
    className: 'border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-lime-50 text-slate-900 shadow-sm',
    iconClassName: 'bg-blue-100 text-blue-700',
  },
  {
    href: COURT_MANAGER_ROUTES.schedule,
    label: 'Manage Schedule',
    eyebrow: 'Court Schedule',
    description: 'Block time for maintenance, closures, and other court-side events.',
    icon: Clock3,
    className: 'border border-amber-100 bg-gradient-to-br from-white via-amber-50 to-orange-50 text-slate-900 shadow-sm',
    iconClassName: 'bg-amber-100 text-amber-700',
  },
  {
    href: COURT_MANAGER_ROUTES.assignedCourt,
    label: 'Review Court',
    eyebrow: 'Assigned Court',
    description: 'Review your assigned court details and current operating context.',
    icon: MapPin,
    className: 'border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-lime-50 text-slate-900 shadow-sm',
    iconClassName: 'bg-emerald-100 text-emerald-700',
  },
];

const CourtManagerOverviewPage: React.FC = () => {
  const { context } = useCourtManagerLayoutContext();
  const [summary, setSummary] = useState<CourtManagerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      try {
        const result = await getCourtManagerOverviewSummary(context);
        if (!isMounted) return;
        setSummary(result);
      } catch (loadError: any) {
        console.error('Failed to load court manager overview:', loadError);
        if (!isMounted) return;
        setError(loadError?.message || 'Failed to load your court manager overview.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [context]);

  return (
    <>
      <CourtManagerHeader
        eyebrow="Court Manager / Overview"
        title={summary?.courtName || context.court.name}
        description="This module only exposes the daily operations needed to run your assigned court. Owner-only settings, payments, analytics for other courts, and business controls stay outside your scope."
        badges={
          <>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 shadow-sm">
              <MapPin size={14} />
              {summary?.courtName || context.court.name}
            </span>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 shadow-sm">
              Simplified court operations
            </span>
          </>
        }
        actions={
          <>
            <Link
              to={COURT_MANAGER_ROUTES.bookings}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-blue-700"
            >
              Open Bookings
            </Link>
            <Link
              to={COURT_MANAGER_ROUTES.schedule}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 transition-all hover:border-blue-200 hover:text-blue-700"
            >
              View Schedule
            </Link>
          </>
        }
      />

      <ManagerStatusBanner courtName={summary?.courtName || context.court.name} />

      {error ? (
        <ManagerEmptyState
          title="Overview Unavailable"
          description={error}
          actionHref={COURT_MANAGER_ROUTES.assignedCourt}
          actionLabel="Open Assigned Court"
        />
      ) : (
        <CourtManagerStats
          isLoading={isLoading}
          items={[
            { label: 'Today Bookings', value: summary?.todayBookings ?? 0 },
            { label: 'Pending Requests', value: summary?.pendingBookings ?? 0 },
            { label: 'Scheduled Blocks', value: summary?.blockedEvents ?? 0 },
          ]}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              to={action.href}
              data-owner-surface={action.href === COURT_MANAGER_ROUTES.assignedCourt ? 'secondary' : undefined}
              className={`group rounded-[30px] p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl ${action.className}`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl p-3 shadow-sm ${action.iconClassName}`}>
                  <Icon size={18} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-75">
                  {action.eyebrow}
                </p>
              </div>
              <p className="mt-4 text-xl font-black uppercase tracking-tight">
                {action.label}
              </p>
              <p className="mt-2 text-sm font-medium opacity-80">
                {action.description}
              </p>
              <div className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                Continue
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
};

export default CourtManagerOverviewPage;
