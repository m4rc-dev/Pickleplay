import React from 'react';
import { Link } from 'react-router-dom';

// Fixed ball positions so they don't re-randomize on re-render
const BALL_POSITIONS = [
  // Biggest balls
  { top: '3%', left: '8%', size: 'w-16 h-16 md:w-32 md:h-32', opacity: 'opacity-[0.22]', delay: '0s', duration: '26s' },
  { top: '70%', right: '3%', size: 'w-16 h-16 md:w-28 md:h-28', opacity: 'opacity-[0.20]', delay: '3s', duration: '28s' },
  // Bigger balls
  { top: '40%', left: '1%', size: 'w-14 h-14 md:w-24 md:h-24', opacity: 'opacity-[0.25]', delay: '1s', duration: '22s' },
  { top: '15%', right: '2%', size: 'w-12 h-12 md:w-22 md:h-22', opacity: 'opacity-[0.22]', delay: '5s', duration: '24s' },
  // Medium balls
  { top: '85%', left: '20%', size: 'w-10 h-10 md:w-18 md:h-18', opacity: 'opacity-[0.28]', delay: '2s', duration: '20s' },
  { top: '55%', right: '15%', size: 'w-10 h-10 md:w-16 md:h-16', opacity: 'opacity-[0.24]', delay: '4s', duration: '19s' },
  { top: '28%', left: '40%', size: 'w-8 h-8 md:w-14 md:h-14', opacity: 'opacity-[0.18]', delay: '6s', duration: '23s' },
  // Small balls
  { top: '8%', left: '50%', size: 'w-6 h-6 md:w-10 md:h-10', opacity: 'opacity-[0.30]', delay: '2.5s', duration: '17s' },
  { top: '93%', right: '40%', size: 'w-6 h-6 md:w-10 md:h-10', opacity: 'opacity-[0.28]', delay: '4.5s', duration: '21s' },
  { top: '62%', left: '55%', size: 'w-5 h-5 md:w-8 md:h-8', opacity: 'opacity-[0.26]', delay: '1.5s', duration: '18s' },
  // Smallest balls
  { top: '48%', right: '45%', size: 'w-4 h-4 md:w-6 md:h-6', opacity: 'opacity-[0.32]', delay: '3.5s', duration: '15s' },
  { top: '78%', left: '70%', size: 'w-4 h-4 md:w-7 md:h-7', opacity: 'opacity-[0.30]', delay: '5.5s', duration: '16s' },
  { top: '18%', right: '60%', size: 'w-3 h-3 md:w-5 md:h-5', opacity: 'opacity-[0.35]', delay: '0.5s', duration: '14s' },
];

const SoftLaunchWelcome: React.FC<{ userName?: string }> = ({ userName }) => {
  const firstName = (userName || 'Player').split(' ')[0];

  return (
    <div className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Floating Ball.png background */}
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
        {BALL_POSITIONS.map((ball, i) => (
          <img
            key={i}
            src="/images/Ball.png"
            alt=""
            className={`absolute ${ball.size} ${ball.opacity} object-contain animate-float-slow`}
            style={{
              top: ball.top,
              left: ball.left,
              right: ball.right,
              animationDelay: ball.delay,
              animationDuration: ball.duration,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-5 py-10 md:py-0">

        {/* ─── DESKTOP: 2-column layout ─── */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-10 items-center min-h-[80vh]">
          {/* Left column — Player image (5 of 12 cols) */}
          <div className="lg:col-span-5 flex items-center justify-center animate-scale-in">
            <div className="relative w-full max-w-[580px] mx-auto">
              <div className="absolute -inset-6 bg-gradient-to-br from-[#155DFC]/5 via-transparent to-emerald-400/5 rounded-[48px] blur-3xl" />
              <img
                src="/images/PLAYER_001.png"
                alt="PicklePlay Player"
                className="relative w-full object-contain drop-shadow-sm rounded-3xl"
              />
            </div>
          </div>

          {/* Right column — Content (7 of 12 cols) */}
          <div className="lg:col-span-7 space-y-8 max-w-2xl">
            {/* Logo + badge */}
            <div className="space-y-4 text-center animate-fade-slide-up" style={{ animationDelay: '0.2s' }}>
              <img
                src="/images/PicklePlayLogo.jpg"
                alt="PicklePlay"
                className="h-24 object-contain rounded-xl mx-auto"
              />
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-[11px] font-extrabold uppercase tracking-[0.15em]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Soft Launch
              </div>
            </div>

            {/* Greeting */}
            <div className="space-y-3 text-center animate-fade-slide-up" style={{ animationDelay: '0.35s' }}>
              <h1 className="text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.08]">
                Welcome,{' '}
                <span className="bg-gradient-to-r from-[#155DFC] to-[#6C3AED] bg-clip-text text-transparent">
                  {firstName}
                </span>
              </h1>
              <p className="text-slate-500 text-[17px] font-medium leading-relaxed">
                You're among the first to join the Philippine pickleball community on PicklePlay.
              </p>
            </div>

            {/* Info card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-7 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.03)] animate-fade-slide-up" style={{ animationDelay: '0.5s' }}>
              <h3 className="text-[17px] font-extrabold text-slate-900 tracking-tight">
                We're getting everything ready
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <img src="/images/PinMarker.png" alt="" className="w-7 h-7 object-contain shrink-0 mt-0.5" />
                  <p className="text-slate-600 text-[15px] leading-relaxed">
                    <strong className="text-slate-800">Court booking isn't available yet</strong> — we're onboarding courts and venues across the Philippines.
                  </p>
                </div>
                <div className="w-full h-px bg-slate-100" />
                <div className="flex items-start gap-3">
                  <img src="/images/Ball.png" alt="" className="w-7 h-7 object-contain shrink-0 mt-0.5" />
                  <p className="text-slate-600 text-[15px] leading-relaxed">
                    Set up your profile, explore the platform, and get ready to play. Every early member helps shape PicklePlay!
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-4 animate-fade-slide-up" style={{ animationDelay: '0.65s' }}>
              <Link
                to="/profile"
                className="flex-1 max-w-[220px] flex items-center justify-center bg-[#155DFC] hover:bg-[#1249D1] text-white font-extrabold text-[13px] uppercase tracking-widest px-6 py-4 rounded-xl shadow-lg shadow-blue-600/15 transition-all duration-200 active:scale-[0.98]"
              >
                Set Up Profile
              </Link>
              <Link
                to="/profile?tab=referral"
                className="flex-1 max-w-[280px] flex items-center justify-center bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-[11px] uppercase tracking-widest px-5 py-4 rounded-xl border border-slate-200 transition-all duration-200 active:scale-[0.98]"
              >
                Invite Player & Court Owner
              </Link>
            </div>

            <p className="text-center text-slate-400 text-[11px] font-bold uppercase tracking-[0.15em] animate-fade-slide-up" style={{ animationDelay: '0.75s' }}>
              Thank you for believing in PH Pickleball
            </p>
          </div>
        </div>

        {/* ─── MOBILE: Single column ─── */}
        <div className="lg:hidden space-y-6">
          {/* Logo + Badge */}
          <div className="text-center space-y-4 animate-fade-slide-up">
            <img
              src="/images/PicklePlayLogo.jpg"
              alt="PicklePlay"
              className="h-24 object-contain rounded-xl mx-auto"
            />
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.15em]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Soft Launch
            </div>
          </div>

          {/* Greeting */}
          <div className="text-center space-y-2.5 animate-fade-slide-up" style={{ animationDelay: '0.15s' }}>
            <h1 className="text-[1.85rem] font-black text-slate-900 tracking-tight leading-[1.1]">
              Welcome,{' '}
              <span className="bg-gradient-to-r from-[#155DFC] to-[#6C3AED] bg-clip-text text-transparent">
                {firstName}
              </span>
            </h1>
            <p className="text-slate-500 text-[14px] font-medium leading-relaxed max-w-xs mx-auto">
              You're among the first to join the Philippine pickleball community on PicklePlay.
            </p>
          </div>

          {/* Info card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden shadow-[0_1px_12px_rgba(0,0,0,0.03)] animate-fade-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="h-0.5 bg-gradient-to-r from-[#155DFC] via-[#6C3AED] to-emerald-400" />
            <div className="p-5 space-y-4">
              <h3 className="text-[15px] font-extrabold text-slate-900 tracking-tight">
                We're getting everything ready
              </h3>
              <div className="bg-slate-50/80 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <img src="/images/PinMarker.png" alt="" className="w-7 h-7 object-contain shrink-0 mt-0.5" />
                  <p className="text-slate-600 text-[13px] leading-relaxed">
                    <strong className="text-slate-800">Court booking isn't available yet</strong> — we're onboarding courts across the Philippines.
                  </p>
                </div>
                <div className="w-full h-px bg-slate-200/60" />
                <div className="flex items-start gap-2.5">
                  <img src="/images/Ball.png" alt="" className="w-7 h-7 object-contain shrink-0 mt-0.5" />
                  <p className="text-slate-600 text-[13px] leading-relaxed">
                    Set up your profile and explore. Every early member helps shape PicklePlay!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2.5 animate-fade-slide-up" style={{ animationDelay: '0.45s' }}>
            <Link
              to="/profile"
              className="w-full flex items-center justify-center bg-[#155DFC] hover:bg-[#1249D1] text-white font-extrabold text-[13px] uppercase tracking-widest px-6 py-4 rounded-2xl shadow-lg shadow-blue-600/15 transition-all duration-200 active:scale-[0.97]"
            >
              Set Up Your Profile
            </Link>
            <Link
              to="/profile?tab=referral"
              className="w-full flex items-center justify-center bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-[11px] uppercase tracking-widest px-6 py-4 rounded-2xl border border-slate-200 transition-all duration-200 active:scale-[0.97]"
            >
              Invite Player & Court Owner
            </Link>
          </div>

          <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em] pb-4 animate-fade-slide-up" style={{ animationDelay: '0.55s' }}>
            Thank you for believing in PH Pickleball
          </p>
        </div>
      </div>

      {/* Float animation keyframes */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-12px) rotate(4deg); }
          50% { transform: translateY(-6px) rotate(-3deg); }
          75% { transform: translateY(-15px) rotate(2deg); }
        }
        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-slide-up {
          opacity: 0;
          animation: fadeSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-in {
          opacity: 0;
          animation: scaleIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default SoftLaunchWelcome;
