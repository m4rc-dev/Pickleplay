import React from 'react';
import type { ReactNode } from 'react';

interface CourtManagerHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  badges?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

const CourtManagerHeader: React.FC<CourtManagerHeaderProps> = ({
  eyebrow = 'Court Manager',
  title,
  description,
  badges,
  actions,
  children,
}) => (
  <div
    data-owner-surface="secondary"
    className="relative overflow-hidden rounded-[36px] border border-slate-100 bg-gradient-to-br from-white via-white to-blue-50 p-6 shadow-sm md:p-7"
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,230,53,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(11,93,59,0.08),transparent_36%)]" />
    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-4xl">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-500">
          {description}
        </p>
        {badges ? <div className="mt-4 flex flex-wrap gap-2">{badges}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3 xl:justify-end">{actions}</div> : null}
    </div>
    {children ? <div className="relative mt-5">{children}</div> : null}
  </div>
);

export default CourtManagerHeader;
