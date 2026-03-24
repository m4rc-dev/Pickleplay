import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface ManagerStatusBannerProps {
  courtName?: string;
}

const ManagerStatusBanner: React.FC<ManagerStatusBannerProps> = ({ courtName }) => (
  <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 px-5 py-4 text-emerald-900 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-white p-2 shadow-sm">
        <ShieldCheck size={18} className="text-emerald-600" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
          Access Guard Active
        </p>
        <p className="mt-1 text-sm font-semibold">
          All Court Manager pages are scoped to {courtName || 'your assigned court'} only.
        </p>
        <p className="mt-1 text-xs font-medium text-emerald-700/80">
          Payments, owner settings, verification tools, and other courts stay outside this module.
        </p>
      </div>
    </div>
  </div>
);

export default ManagerStatusBanner;
