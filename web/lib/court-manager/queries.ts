import { supabase } from '../../services/supabase';
import {
  getCurrentActiveRole,
  getCurrentCourtManagerContext,
  getCurrentPendingCourtManagerContext,
} from '../../services/courtManagers';
import type { UserRole } from '../../types';
import type {
  CourtManagerContext,
  CourtManagerSummary,
  PendingCourtManagerContext,
} from '../../types/court-manager';

export interface CourtManagerRouteQueryResult {
  activeRole: UserRole;
  activeContext: CourtManagerContext | null;
  pendingContext: PendingCourtManagerContext | null;
}

export const loadCourtManagerRouteContext = async (): Promise<CourtManagerRouteQueryResult> => {
  const activeRole = await getCurrentActiveRole();

  const [activeContext, pendingContext] = await Promise.all([
    activeRole === 'COURT_MANAGER'
      ? getCurrentCourtManagerContext()
      : Promise.resolve(null),
    activeRole === 'COURT_MANAGER'
      ? Promise.resolve(null)
      : getCurrentPendingCourtManagerContext(),
  ]);

  return {
    activeRole,
    activeContext,
    pendingContext,
  };
};

export const getCourtManagerOverviewSummary = async (
  context: CourtManagerContext
): Promise<CourtManagerSummary> => {
  const today = new Date().toISOString().split('T')[0];
  const [{ data: bookings, error: bookingsError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase
        .from('bookings')
        .select('id, status, date')
        .eq('court_id', context.court.id),
      supabase
        .from('court_events')
        .select('id')
        .eq('court_id', context.court.id)
        .gte('end_datetime', new Date().toISOString()),
    ]);

  if (bookingsError) throw bookingsError;
  if (eventsError) throw eventsError;

  return {
    courtName: context.court.name,
    todayBookings: (bookings || []).filter((item: any) => item.date === today).length,
    pendingBookings: (bookings || []).filter((item: any) => item.status === 'pending').length,
    blockedEvents: (events || []).length,
  };
};
