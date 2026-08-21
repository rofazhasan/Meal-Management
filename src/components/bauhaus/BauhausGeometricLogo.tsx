import React from 'react';

interface BauhausGeometricLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BauhausGeometricLogo: React.FC<BauhausGeometricLogoProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      container: 'h-7 gap-1',
      shape: 'w-4 h-4 border',
      triangle: 'w-4 h-4',
    },
    md: {
      container: 'h-10 gap-1.5',
      shape: 'w-6 h-6 border-2',
      triangle: 'w-6 h-6',
    },
    lg: {
      container: 'h-14 gap-2',
      shape: 'w-8 h-8 border-2',
      triangle: 'w-8 h-8',
    },
  }[size];

  return (
    <div
      className={`inline-flex items-center ${sizeClasses.container} select-none ${className}`}
      title="Bauhaus Geometric Identity: Circle, Square, Triangle"
    >
      {/* 1. Bauhaus Blue Circle */}
      <div
        className={`${sizeClasses.shape} rounded-full bg-[#1040C0] border-black shadow-[2px_2px_0px_0px_black] dark:border-white dark:shadow-[2px_2px_0px_0px_white] transition-transform hover:-translate-y-0.5`}
      />

      {/* 2. Bauhaus Red Square */}
      <div
        className={`${sizeClasses.shape} rounded-none bg-[#D02020] border-black shadow-[2px_2px_0px_0px_black] dark:border-white dark:shadow-[2px_2px_0px_0px_white] transition-transform hover:-translate-y-0.5`}
      />

      {/* 3. Bauhaus Yellow Triangle */}
      <div
        className={`relative ${sizeClasses.triangle} flex items-center justify-center transition-transform hover:-translate-y-0.5`}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:drop-shadow-[2px_2px_0px_rgba(255,255,255,1)]"
        >
          <polygon
            points="12,2 22,22 2,22"
            fill="#F0C020"
            stroke="currentColor"
            strokeWidth="2"
            className="text-black dark:text-white"
          />
        </svg>
      </div>
    </div>
  );
};
