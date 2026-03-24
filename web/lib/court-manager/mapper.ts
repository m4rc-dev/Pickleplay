import type { UserRole } from '../../types';
import type {
  ActiveCourtRole,
  CourtManagerStatus,
  CourtOperationsTarget,
} from '../../types/court-manager';
import {
  COURT_MANAGER_LEGACY_FALLBACK_ROUTES,
  COURT_MANAGER_ROUTES,
} from './constants';

const normalizeCourtRole = (role: ActiveCourtRole | UserRole | null | undefined) =>
  role === 'COURT_MANAGER' ? 'COURT_MANAGER' : role === 'COURT_OWNER' ? 'COURT_OWNER' : 'OTHER';

export const getCourtManagerStatusLabel = (status: CourtManagerStatus) => {
  switch (status) {
    case 'pending_invite':
      return 'Invite Sent';
    case 'pending_approval':
      return 'Pending Approval';
    case 'active':
      return 'Active';
    case 'removed':
      return 'Removed';
    default:
      return status.replace(/_/g, ' ');
  }
};

export const getCourtManagerStatusClasses = (status: CourtManagerStatus) => {
  switch (status) {
    case 'pending_invite':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'pending_approval':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'removed':
    default:
      return 'bg-slate-100 text-slate-500 border-slate-200';
  }
};

export const getCourtOperationsRoute = (
  role: ActiveCourtRole | UserRole | null | undefined,
  target: CourtOperationsTarget
) => {
  const normalizedRole = normalizeCourtRole(role);

  if (normalizedRole === 'COURT_MANAGER') {
    if (target === 'assignedCourt') return COURT_MANAGER_ROUTES.assignedCourt;
    if (target === 'bookings') return COURT_MANAGER_ROUTES.bookings;
    return COURT_MANAGER_ROUTES.schedule;
  }

  if (target === 'assignedCourt') return COURT_MANAGER_LEGACY_FALLBACK_ROUTES.assignedCourt;
  if (target === 'bookings') return COURT_MANAGER_LEGACY_FALLBACK_ROUTES.bookings;
  return COURT_MANAGER_LEGACY_FALLBACK_ROUTES.schedule;
};
