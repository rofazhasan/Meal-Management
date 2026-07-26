import React from 'react';

interface ShimmerLoaderProps {
  className?: string;
  count?: number;
}

export const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({ className = 'h-12 w-full', count = 1 }) => {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`rounded-xl bg-slate-900/60 border border-slate-800/60 overflow-hidden relative ${className}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/40 to-transparent animate-shimmer" />
        </div>
      ))}
    </div>
  );
};
