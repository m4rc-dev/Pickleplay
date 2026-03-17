import type { CourtManagerContext, PendingCourtManagerContext } from '../services/courtManagers';
import type { CourtManagerAssignment, CourtManagerStatus, UserRole } from '../types';

export type { CourtManagerAssignment, CourtManagerContext, CourtManagerStatus, PendingCourtManagerContext, UserRole };

export type CourtManagerSection = 'overview' | 'assigned-court' | 'bookings' | 'schedule';
export type CourtOperationsTarget = 'assignedCourt' | 'bookings' | 'schedule';
export type ActiveCourtRole = 'COURT_OWNER' | 'COURT_MANAGER' | 'OTHER';

export interface CourtManagerNavItem {
  section: CourtManagerSection;
  label: string;
  description: string;
  href: string;
}

export interface CourtManagerSummary {
  courtName: string;
  todayBookings: number;
  pendingBookings: number;
  blockedEvents: number;
}

export interface CourtManagerLayoutContext {
  role: UserRole;
  context: CourtManagerContext;
}
