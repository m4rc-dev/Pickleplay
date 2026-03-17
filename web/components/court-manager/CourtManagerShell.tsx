import React from 'react';
import type { ReactNode } from 'react';

interface CourtManagerShellProps {
  children: ReactNode;
}

const CourtManagerShell: React.FC<CourtManagerShellProps> = ({
  children,
}) => (
  <div className="space-y-6">{children}</div>
);

export default CourtManagerShell;
