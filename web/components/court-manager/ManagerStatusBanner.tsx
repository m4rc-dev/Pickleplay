import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface ManagerStatusBannerProps {
  courtName?: string;
}

const ManagerStatusBanner: React.FC<ManagerStatusBannerProps> = ({ courtName }) => (
  <div
    data-owner-surface="secondary"
    className="rounded-[28px] border border-emerald-200 bg-gradient-to-r from-emerald-50 via-lime-50 to-white px-5 py-4 text-slate-900 shadow-sm"
  >
    <div className="flex items-start gap-3">
      <div className="rounded-2xl border border-emerald-200 bg-white p-2 shadow-sm">
        <ShieldCheck size={18} className="text-emerald-600" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
          Access Guard Active
        </p>
        <p className="mt-1 text-sm font-semibold">
          All Court Manager pages are scoped to {courtName || 'your assigned court'} only.
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Payments, owner settings, verification tools, and other courts stay outside this module.
        </p>
      </div>
    </div>
  </div>
);

export default ManagerStatusBanner;
