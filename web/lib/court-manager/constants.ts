import type { CourtManagerNavItem } from '../../types/court-manager';

export const COURT_MANAGER_ROUTES = {
  overview: '/court-manager',
  assignedCourt: '/court-manager/assigned-court',
  bookings: '/court-manager/bookings',
  schedule: '/court-manager/schedule',
} as const;

export const COURT_MANAGER_LEGACY_FALLBACK_ROUTES = {
  assignedCourt: '/locations',
  bookings: '/bookings-admin',
  schedule: '/court-calendar',
} as const;

export const COURT_MANAGER_NAV_ITEMS: CourtManagerNavItem[] = [
  {
    section: 'overview',
    label: 'Overview',
    description: 'Daily court operations snapshot',
    href: COURT_MANAGER_ROUTES.overview,
  },
  {
    section: 'assigned-court',
    label: 'Assigned Court',
    description: 'Review the only court in your scope',
    href: COURT_MANAGER_ROUTES.assignedCourt,
  },
  {
    section: 'bookings',
    label: 'Court Bookings',
    description: 'Check-ins, status changes, and schedules',
    href: COURT_MANAGER_ROUTES.bookings,
  },
  {
    section: 'schedule',
    label: 'Court Schedule',
    description: 'Block or reopen time on the assigned court',
    href: COURT_MANAGER_ROUTES.schedule,
  },
];
