import React from 'react';
import type { ReactNode } from 'react';

interface CourtManagerShellProps {
  children: ReactNode;
}

const CourtManagerShell: React.FC<CourtManagerShellProps> = ({
  children,
}) => (
  <div className="space-y-6 pb-4 md:space-y-8" data-dashboard-role="court-owner">
    {children}
  </div>
);

export default CourtManagerShell;
