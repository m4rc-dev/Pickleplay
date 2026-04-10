import React from 'react';

/** Same positions as Soft Launch — floating Ball.png background. */
export const SOFT_LAUNCH_BALL_POSITIONS = [
  { top: '3%', left: '8%', size: 'w-16 h-16 md:w-32 md:h-32', opacity: 'opacity-[0.22]', delay: '0s', duration: '26s' },
  { top: '70%', right: '3%', size: 'w-16 h-16 md:w-28 md:h-28', opacity: 'opacity-[0.20]', delay: '3s', duration: '28s' },
  { top: '40%', left: '1%', size: 'w-14 h-14 md:w-24 md:h-24', opacity: 'opacity-[0.25]', delay: '1s', duration: '22s' },
  { top: '15%', right: '2%', size: 'w-12 h-12 md:w-22 md:h-22', opacity: 'opacity-[0.22]', delay: '5s', duration: '24s' },
  { top: '85%', left: '20%', size: 'w-10 h-10 md:w-18 md:h-18', opacity: 'opacity-[0.28]', delay: '2s', duration: '20s' },
  { top: '55%', right: '15%', size: 'w-10 h-10 md:w-16 md:h-16', opacity: 'opacity-[0.24]', delay: '4s', duration: '19s' },
  { top: '28%', left: '40%', size: 'w-8 h-8 md:w-14 md:h-14', opacity: 'opacity-[0.18]', delay: '6s', duration: '23s' },
  { top: '8%', left: '50%', size: 'w-6 h-6 md:w-10 md:h-10', opacity: 'opacity-[0.30]', delay: '2.5s', duration: '17s' },
  { top: '93%', right: '40%', size: 'w-6 h-6 md:w-10 md:h-10', opacity: 'opacity-[0.28]', delay: '4.5s', duration: '21s' },
  { top: '62%', left: '55%', size: 'w-5 h-5 md:w-8 md:h-8', opacity: 'opacity-[0.26]', delay: '1.5s', duration: '18s' },
  { top: '48%', right: '45%', size: 'w-4 h-4 md:w-6 md:h-6', opacity: 'opacity-[0.32]', delay: '3.5s', duration: '15s' },
  { top: '78%', left: '70%', size: 'w-4 h-4 md:w-7 md:h-7', opacity: 'opacity-[0.30]', delay: '5.5s', duration: '16s' },
  { top: '18%', right: '60%', size: 'w-3 h-3 md:w-5 md:h-5', opacity: 'opacity-[0.35]', delay: '0.5s', duration: '14s' },
] as const;

/** Floating balls + shared keyframes (float, fade-slide-up, scale-in) used by Soft Launch & Feature Unavailable. */
export const SoftLaunchPageDecor: React.FC = () => (
  <>
    <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
      {SOFT_LAUNCH_BALL_POSITIONS.map((ball, i) => (
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
  </>
);
