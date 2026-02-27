import React from 'react';

interface Props {
  variant: 'cards' | 'my-squad';
}

const CardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
    <div className="aspect-[16/10] bg-slate-200/70 animate-pulse"></div>
    <div className="p-7 space-y-5">
      <div className={`h-6 bg-slate-200/70 rounded animate-pulse ${index % 3 === 0 ? 'w-2/3' : index % 2 === 0 ? 'w-3/4' : 'w-1/2'}`}></div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div>
        <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2 animate-pulse">
          <div className="h-3 w-14 bg-slate-200/60 rounded"></div>
          <div className="h-6 w-10 bg-slate-200/60 rounded"></div>
        </div>
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2 animate-pulse">
          <div className="h-3 w-14 bg-slate-200/60 rounded"></div>
          <div className="h-6 w-10 bg-slate-200/60 rounded"></div>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-7 w-20 bg-slate-100 rounded-lg animate-pulse"></div>
        <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse"></div>
        <div className="h-7 w-16 bg-slate-100 rounded-lg animate-pulse"></div>
      </div>
      <div className="h-14 bg-slate-100 rounded-2xl animate-pulse"></div>
    </div>
  </div>
);

export const SquadsListSkeleton: React.FC<Props> = ({ variant }) => {
  if (variant === 'my-squad') {
    return (
      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm animate-in fade-in duration-500">
        <div className="aspect-[21/6] bg-slate-200/70 animate-pulse"></div>
        <div className="p-8 space-y-5">
          <div className="flex items-center gap-4">
            <div className="h-8 w-48 bg-slate-200/70 rounded-lg animate-pulse"></div>
            <div className="h-6 w-20 bg-blue-100/60 rounded-full animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-slate-100 rounded w-4/5 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2 animate-pulse">
                <div className="h-3 w-16 bg-slate-200/60 rounded"></div>
                <div className="h-7 w-12 bg-slate-200/60 rounded"></div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <div className="h-12 w-32 bg-slate-100 rounded-2xl animate-pulse"></div>
            <div className="h-12 w-32 bg-slate-100 rounded-2xl animate-pulse"></div>
            <div className="h-12 w-12 bg-slate-100 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <CardSkeleton key={i} index={i} />
      ))}
    </>
  );
};
