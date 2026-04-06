import React from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ManagerEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
}

const ManagerEmptyState: React.FC<ManagerEmptyStateProps> = ({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}) => (
  <div
    data-owner-surface="secondary"
    className="relative overflow-hidden rounded-[32px] border border-dashed border-slate-200 bg-gradient-to-br from-white via-white to-blue-50 p-8 text-center shadow-sm"
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(163,230,53,0.18),transparent_30%)]" />
    <div className="relative">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm">
        {icon || <ClipboardList size={24} />}
      </div>
      <h2 className="mt-5 text-2xl font-black uppercase tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          to={actionHref}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-blue-700"
        >
          {actionLabel}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  </div>
);

export default ManagerEmptyState;
