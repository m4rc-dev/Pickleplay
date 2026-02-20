import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Lock, ArrowLeft } from 'lucide-react';

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
};

interface FeatureUnavailableProps {
  featureName?: string;
}

const FeatureUnavailable: React.FC<FeatureUnavailableProps> = ({ featureName }) => {
  const navigate = useNavigate();
  const label = featureName ? (FEATURE_LABELS[featureName] ?? featureName) : 'This feature';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full text-center">

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-amber-100 text-amber-500 mb-6 shadow-inner">
          <Clock size={44} strokeWidth={1.5} />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-[11px] font-black uppercase tracking-widest mb-4">
          <Lock size={10} />
          Temporarily Unavailable
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          {label}
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          This feature is currently disabled for your account. Please contact your administrator or check back later.
        </p>

        {/* Action */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-slate-700 active:scale-95 transition-all"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    </div>
  );
};

export default FeatureUnavailable;
