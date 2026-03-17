import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock3, MapPin } from 'lucide-react';
import CourtManagerHeader from '../CourtManagerHeader';
import CourtManagerStats from '../CourtManagerStats';
import ManagerEmptyState from '../ManagerEmptyState';
import { useCourtManagerLayoutContext } from '../CourtManagerLayout';
import { COURT_MANAGER_ROUTES } from '../../../lib/court-manager/constants';
import { getCourtManagerOverviewSummary } from '../../../lib/court-manager/queries';
import type { CourtManagerSummary } from '../../../types/court-manager';

const quickActions = [
  {
    href: COURT_MANAGER_ROUTES.bookings,
    label: 'Court Bookings',
    description: 'Check in players, confirm unpaid requests, and keep booking flow moving.',
    icon: CalendarDays,
    className: 'bg-blue-600 text-white shadow-blue-900/10',
  },
  {
    href: COURT_MANAGER_ROUTES.schedule,
    label: 'Court Schedule',
    description: 'Block time for maintenance, closures, and other court-side events.',
    icon: Clock3,
    className: 'bg-slate-900 text-white shadow-slate-900/10',
  },
  {
    href: COURT_MANAGER_ROUTES.assignedCourt,
    label: 'Assigned Court',
    description: 'Review your assigned court details and current operating context.',
    icon: MapPin,
    className: 'border border-slate-200 bg-white text-slate-900 shadow-sm',
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
      />

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
              className={`rounded-[28px] p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl ${action.className}`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <Icon size={18} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-75">
                  {action.label}
                </p>
              </div>
              <p className="mt-4 text-xl font-black uppercase tracking-tight">
                {action.label}
              </p>
              <p className="mt-2 text-sm font-medium opacity-80">
                {action.description}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
};

export default CourtManagerOverviewPage;
