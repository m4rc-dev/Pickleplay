import React from 'react';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ManagerEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

const ManagerEmptyState: React.FC<ManagerEmptyStateProps> = ({
  title,
  description,
  actionLabel,
  actionHref,
}) => (
  <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-100 text-slate-500">
      <ClipboardList size={22} />
    </div>
    <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">
      {title}
    </h2>
    <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-slate-500">
      {description}
    </p>
    {actionLabel && actionHref && (
      <Link
        to={actionHref}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-blue-700"
      >
        {actionLabel}
        <ArrowRight size={16} />
      </Link>
    )}
  </div>
);

export default ManagerEmptyState;
