import React from 'react';

export const SquadDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Banner */}
      <div className="relative aspect-[21/9] max-h-[260px] bg-slate-200/70 rounded-3xl overflow-hidden animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-300/30 to-transparent"></div>
        <div className="absolute bottom-6 left-6 space-y-2">
          <div className="h-8 w-52 bg-white/30 rounded-lg animate-pulse"></div>
          <div className="h-4 w-32 bg-white/20 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Title + Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-9 w-56 bg-slate-200/70 rounded-lg animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-slate-200/50 rounded-full animate-pulse"></div>
            <div className="h-5 w-24 bg-slate-200/50 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-12 w-28 bg-slate-200/50 rounded-2xl animate-pulse"></div>
          <div className="h-12 w-12 bg-slate-200/50 rounded-2xl animate-pulse"></div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left — Chat */}
        <div className="flex-1 space-y-5">
          {/* Tabs */}
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-28 bg-slate-200/40 rounded-2xl animate-pulse"></div>
            ))}
          </div>

          {/* Messages */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 space-y-5 min-h-[420px]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                <div className="w-10 h-10 bg-slate-200/70 rounded-full animate-pulse shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className={`h-3 w-24 bg-slate-200/60 rounded animate-pulse ${i % 2 === 0 ? 'ml-auto' : ''}`}></div>
                  <div className={`h-14 ${i % 2 === 0 ? 'w-3/5 ml-auto bg-blue-50/80' : 'w-2/3 bg-slate-50'} rounded-2xl animate-pulse`}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-4 flex gap-3">
            <div className="flex-1 h-12 bg-slate-100/80 rounded-2xl animate-pulse"></div>
            <div className="h-12 w-12 bg-blue-100/60 rounded-2xl animate-pulse"></div>
          </div>
        </div>

        {/* Right — Info */}
        <div className="w-full lg:w-96 space-y-6">
          {/* Info card */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 space-y-4">
            <div className="h-6 w-28 bg-slate-200/60 rounded animate-pulse"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-14 bg-slate-200/50 rounded animate-pulse"></div>
                  <div className="h-7 w-10 bg-slate-200/60 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 space-y-4">
            <div className="h-6 w-28 bg-slate-200/60 rounded animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-slate-200/60 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-1.5">
                    <div className={`h-4 bg-slate-200/60 rounded animate-pulse ${i % 2 === 0 ? 'w-24' : 'w-28'}`}></div>
                    <div className="h-3 w-16 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                  <div className="h-6 w-16 bg-slate-100 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Events */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 space-y-4">
            <div className="h-6 w-36 bg-slate-200/60 rounded animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl space-y-2">
                  <div className="h-5 w-44 bg-slate-200/60 rounded animate-pulse"></div>
                  <div className="h-4 w-28 bg-slate-200/50 rounded animate-pulse"></div>
                  <div className="h-3 w-20 bg-slate-100 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
