import React from 'react';
import { Construction, ShieldCheck, ArrowLeft } from 'lucide-react';

interface MaintenanceScreenProps {
  message?: string;
  onLogout?: () => void;
}

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  message = 'We are currently performing scheduled maintenance. Please check back shortly.',
  onLogout,
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div className="relative z-10 max-w-lg w-full mx-4 text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-[32px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30 animate-bounce [animation-duration:3s]">
              <Construction size={52} className="text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg border-2 border-slate-900">
              <ShieldCheck size={20} className="text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-4">
          Under Maintenance
        </h1>

        {/* Status badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400/10 border border-amber-400/20 rounded-full mb-8">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest">
            System Update in Progress
          </span>
        </div>

        {/* Message card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-10 mb-8">
          <p className="text-white/80 text-base md:text-lg font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* Info items */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Status</p>
            <p className="text-sm font-black text-white uppercase">In Progress</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">We'll be back</p>
            <p className="text-sm font-black text-white uppercase">Soon</p>
          </div>
        </div>

        {/* Logout button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all active:scale-95"
          >
            <ArrowLeft size={16} />
            Sign Out
          </button>
        )}

        {/* Footer */}
        <p className="mt-12 text-[10px] font-bold text-white/20 uppercase tracking-widest">
          PicklePlay Philippines &middot; We'll be right back
        </p>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
