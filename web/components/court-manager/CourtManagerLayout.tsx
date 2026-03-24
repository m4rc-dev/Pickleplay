import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import CourtManagerShell from './CourtManagerShell';
import ManagerEmptyState from './ManagerEmptyState';
import {
  getCourtManagerRedirectPath,
  resolveCourtManagerAccessState,
} from '../../lib/court-manager/guards';
import { loadCourtManagerRouteContext } from '../../lib/court-manager/queries';
import type {
  CourtManagerLayoutContext,
  PendingCourtManagerContext,
} from '../../types/court-manager';

const CourtManagerLayout: React.FC = () => {
  const [routeContext, setRouteContext] = useState<{
    role: CourtManagerLayoutContext['role'];
    context: CourtManagerLayoutContext['context'] | null;
    pendingContext: PendingCourtManagerContext | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const result = await loadCourtManagerRouteContext();
        if (!isMounted) return;
        setRouteContext({
          role: result.activeRole,
          context: result.activeContext,
          pendingContext: result.pendingContext,
        });
      } catch (error) {
        console.error('Failed to load court manager route context:', error);
        if (!isMounted) return;
        setRouteContext({
          role: 'guest',
          context: null,
          pendingContext: null,
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <CourtManagerShell>
        <ManagerEmptyState
          title="Checking Manager Access"
          description="We are confirming your assigned court and approval state before loading Court Manager mode."
        />
      </CourtManagerShell>
    );
  }

  const accessState = resolveCourtManagerAccessState({
    role: routeContext?.role || 'guest',
    activeContext: routeContext?.context || null,
    pendingContext: routeContext?.pendingContext || null,
  });

  if (accessState !== 'active' || !routeContext?.context) {
    return (
      <Navigate
        to={getCourtManagerRedirectPath({
          role: routeContext?.role || 'guest',
          pendingContext: routeContext?.pendingContext || null,
        })}
        replace
      />
    );
  }

  return (
    <CourtManagerShell>
      <Outlet
        context={{
          role: routeContext.role,
          context: routeContext.context,
        } satisfies CourtManagerLayoutContext}
      />
    </CourtManagerShell>
  );
};

export const useCourtManagerLayoutContext = () =>
  useOutletContext<CourtManagerLayoutContext>();

export default CourtManagerLayout;
