import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { SoftLaunchPageDecor } from './SoftLaunchPageDecor';

const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  booking: 'Court Booking',
  'my-bookings': 'My Bookings',
  messages: 'Messages',
  tournaments: 'Tournaments',
  guides: 'Guides',
  teams: 'Teams',
  partners: 'Find Partners',
  coaches: 'Coaches',
  community: 'Community Hub',
  news: 'News Feed',
  shop: 'Pro Shop',
  profile: 'Profile',
  rankings: 'Rankings',
  academy: 'Academy',
  students: 'Students',
  clinics: 'Clinics',
  schedule: 'Schedule',
  locations: 'Locations',
  'bookings-admin': 'Bookings Admin',
  'court-calendar': 'Court Calendar',
  'tournaments-admin': 'Tournaments Admin',
  revenue: 'Revenue',
  'court-policies': 'Court Policies',
  others: 'More',
};

interface FeatureUnavailableProps {
  featureName?: string;
}

const FeatureUnavailable: React.FC<FeatureUnavailableProps> = ({ featureName }) => {
  const navigate = useNavigate();
  const label = featureName ? (FEATURE_LABELS[featureName] ?? featureName) : 'This page';

  return (
    <div className="relative min-h-[90vh] w-full flex items-center overflow-hidden">
      <SoftLaunchPageDecor />

      <div className="relative z-10 w-full max-w-2xl mx-auto px-5 py-10 md:py-16 space-y-8">
        <div className="text-center space-y-4">
          <img
            src="/images/PicklePlayLogo.jpg"
            alt="PicklePlay"
            className="h-20 md:h-24 object-contain rounded-xl mx-auto"
          />
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-3.5 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.15em] border border-amber-200/80">
            <Lock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
            Temporarily Disabled
          </div>
        </div>

        <div className="text-center space-y-2.5">
          <h1 className="text-2xl md:text-[1.85rem] font-black text-slate-900 tracking-tight leading-[1.1]">
            <span className="bg-gradient-to-r from-[#155DFC] to-[#6C3AED] bg-clip-text text-transparent">{label}</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-[15px] font-medium leading-relaxed max-w-md mx-auto">
            Access to this area is paused for your account.
          </p>
        </div>

        {/* Card — same structure as Soft Launch desktop info card (Pin + divider + Ball) */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 md:p-7 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.03)]">
          <h3 className="text-[15px] md:text-[17px] font-extrabold text-slate-900 tracking-tight">
            Here&apos;s what you should know
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <img src="/images/PinMarker.png" alt="" className="w-7 h-7 object-contain shrink-0 mt-0.5" />
              <p className="text-slate-600 text-[13px] md:text-[15px] leading-relaxed">
                <strong className="text-slate-800">{label} isn&apos;t available right now</strong> — an administrator
                turned this page off for your role.
              </p>
            </div>
            <div className="w-full h-px bg-slate-100" />
            <div className="flex items-start gap-3">
              <img src="/images/Ball.png" alt="" className="w-7 h-7 object-contain shrink-0 mt-0.5" />
              <p className="text-slate-600 text-[13px] md:text-[15px] leading-relaxed">
                You can still explore PicklePlay elsewhere. Contact your club or PicklePlay admin if you need this page
                turned back on.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons — Soft Launch style: side-by-side, rounded-xl */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 sm:max-w-[220px] flex items-center justify-center bg-[#155DFC] hover:bg-[#1249D1] text-white font-extrabold text-[13px] uppercase tracking-widest px-6 py-4 rounded-xl shadow-lg shadow-blue-600/15 transition-all duration-200 active:scale-[0.98]"
          >
            Go Back
          </button>
          <Link
            to="/dashboard"
            className="flex-1 sm:max-w-[280px] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-[11px] uppercase tracking-widest px-5 py-4 rounded-xl border border-slate-200 transition-all duration-200 active:scale-[0.98]"
          >
            Home
          </Link>
        </div>

        <p className="text-center text-slate-400 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em]">
          Thank you for believing in PH Pickleball
        </p>
      </div>
    </div>
  );
};

export default FeatureUnavailable;
