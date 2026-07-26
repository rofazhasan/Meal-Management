import React from 'react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  return (
    <div className={`relative group shrink-0 ${className}`}>
      {/* Outer Ambient Glow */}
      <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 via-sky-400 to-amber-300 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-500" />
      
      {/* Hexagonal / Rounded Glass Badge Container */}
      <div className={`${sizeMap[size]} relative rounded-2xl bg-slate-950/90 p-1.5 border border-cyan-400/40 shadow-2xl flex items-center justify-center backdrop-blur-xl overflow-hidden`}>
        {/* Subtle Diagonal Glass Light Reflection */}
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/20 via-transparent to-transparent transform rotate-45 pointer-events-none" />

        {/* Vector SVG Badge Logo */}
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            {/* Cyan Gradient */}
            <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            
            {/* Gold Accent Gradient */}
            <linearGradient id="goldGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Glowing Shadow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Hexagon Border Frame */}
          <polygon
            points="50,5 88,27 88,73 50,95 12,73 12,27"
            stroke="url(#cyanGradient)"
            strokeWidth="3.5"
            strokeLinejoin="round"
            fill="none"
            opacity="0.8"
          />

          {/* Inner Hexagon Accent */}
          <polygon
            points="50,11 83,30 83,70 50,89 17,70 17,30"
            stroke="url(#goldGradient)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            fill="none"
            opacity="0.5"
          />

          {/* Plate Circular Rim */}
          <circle cx="50" cy="50" r="28" stroke="url(#cyanGradient)" strokeWidth="4" opacity="0.9" filter="url(#glow)" />
          <circle cx="50" cy="50" r="20" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />

          {/* Fork Silhouette */}
          <g filter="url(#glow)">
            <path
              d="M 41 38 V 46 C 41 49 44 52 44 54 V 66 C 44 67.5 45.5 68.5 47 68.5 C 48.5 68.5 50 67.5 50 66 V 54 C 50 52 53 49 53 46 V 38"
              stroke="url(#goldGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="47" y1="38" x2="47" y2="45" stroke="url(#goldGradient)" strokeWidth="2.2" strokeLinecap="round" />
          </g>

          {/* Spoon Silhouette */}
          <g filter="url(#glow)">
            <path
              d="M 57 38 C 53 38 52 44 54 48 C 55.5 50.5 58 52.5 58 55 V 66 C 58 67.5 59.2 68.5 60.5 68.5 C 61.8 68.5 63 67.5 63 66 V 55 C 63 52.5 65.5 50.5 67 48 C 69 44 68 38 64 38 Z"
              fill="url(#cyanGradient)"
              opacity="0.9"
            />
          </g>

          {/* Top Star Glow Accent */}
          <circle cx="50" cy="20" r="2.5" fill="#fef08a" />
        </svg>
      </div>
    </div>
  );
};
