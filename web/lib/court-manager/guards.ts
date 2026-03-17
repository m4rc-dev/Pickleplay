import type { UserRole } from '../../types';
import type {
  CourtManagerContext,
  PendingCourtManagerContext,
} from '../../types/court-manager';

export type CourtManagerAccessState =
  | 'active'
  | 'pending_approval'
  | 'unauthorized';

export const resolveCourtManagerAccessState = ({
  role,
  activeContext,
  pendingContext,
}: {
  role: UserRole;
  activeContext: CourtManagerContext | null;
  pendingContext: PendingCourtManagerContext | null;
}): CourtManagerAccessState => {
  if (role === 'COURT_MANAGER' && activeContext) {
    return 'active';
  }

  if (pendingContext) {
    return 'pending_approval';
  }

  return 'unauthorized';
};

export const getCourtManagerRedirectPath = ({
  role,
  pendingContext,
}: {
  role: UserRole;
  pendingContext: PendingCourtManagerContext | null;
}) => {
  if (pendingContext) {
    return '/dashboard';
  }

  if (role === 'COURT_OWNER') {
    return '/locations';
  }

  if (role === 'guest') {
    return '/login';
  }

  return '/dashboard';
};
