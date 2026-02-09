import React from 'react';

interface SkeletonProps {
  className?: string;
  dark?: boolean;
}

export function SkeletonLine({ className = 'w-3/4 h-3', dark = true }: SkeletonProps) {
  return (
    <div className={`rounded-lg ${dark ? 'bg-white/5' : 'bg-slate-200'} skeleton-shimmer ${className}`} />
  );
}

export function SkeletonCircle({ className = 'w-10 h-10', dark = true }: SkeletonProps) {
  return (
    <div className={`rounded-full ${dark ? 'bg-white/5' : 'bg-slate-200'} skeleton-shimmer ${className}`} />
  );
}

export function SkeletonCard({ dark = true }: { dark?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${dark ? 'bg-white/[0.02] border border-white/5' : 'bg-white border border-slate-200'}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonCircle dark={dark} />
        <div className="flex-1 space-y-2">
          <SkeletonLine dark={dark} className="w-1/3 h-3" />
          <SkeletonLine dark={dark} className="w-1/2 h-2.5" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonLine dark={dark} className="w-full h-2.5" />
        <SkeletonLine dark={dark} className="w-5/6 h-2.5" />
        <SkeletonLine dark={dark} className="w-2/3 h-2.5" />
      </div>
    </div>
  );
}

export function SkeletonOrderList({ count = 3, dark = true }: { count?: number; dark?: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} dark={dark} />
      ))}
    </div>
  );
}
