import type { UserRole } from '../../types';

export const isCourtOwnerRole = (role: UserRole | null | undefined) => role === 'COURT_OWNER';

export const isCourtManagerRole = (role: UserRole | null | undefined) => role === 'COURT_MANAGER';

export const canOperateCourt = (role: UserRole | null | undefined) =>
  isCourtOwnerRole(role) || isCourtManagerRole(role);

export const canAccessCourtManagerPages = (role: UserRole | null | undefined) =>
  isCourtManagerRole(role);
