
import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
  const baseClasses = 'shimmer rounded-xl';
  const variantClasses = {
    rectangular: '',
    circular: 'rounded-full',
    text: 'h-4 w-full rounded-md'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
};

export const PostSkeleton = () => (
  <div className="bg-white rounded-[48px] border border-slate-200 p-8 space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="w-14 h-14 rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-20 h-3" />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-[90%] h-4" />
      <Skeleton className="w-[70%] h-4" />
    </div>
    <Skeleton className="w-full aspect-video rounded-[32px]" />
  </div>
);

export const ProductSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="aspect-[3/4] rounded-[40px]" />
    <div className="space-y-2 px-2">
      <Skeleton className="w-24 h-3" />
      <Skeleton className="w-full h-5" />
      <Skeleton className="w-20 h-6" />
    </div>
  </div>
);

export const CourtSkeleton = () => (
  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
    <Skeleton className="h-48" />
    <div className="p-5 space-y-3">
      <Skeleton className="w-2/3 h-6" />
      <div className="flex gap-4">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-24 h-4" />
      </div>
    </div>
  </div>
);
