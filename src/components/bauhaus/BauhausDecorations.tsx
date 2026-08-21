import React from 'react';

export const BauhausCornerShape: React.FC<{
  type?: 'circle' | 'square' | 'triangle';
  color?: 'red' | 'blue' | 'yellow' | 'black';
  className?: string;
}> = ({ type = 'circle', color = 'red', className = '' }) => {
  const bgColors = {
    red: 'bg-[#D02020]',
    blue: 'bg-[#1040C0]',
    yellow: 'bg-[#F0C020]',
    black: 'bg-[#121212] dark:bg-white',
  }[color];

  if (type === 'circle') {
    return (
      <div
        className={`w-3.5 h-3.5 rounded-full border border-black dark:border-white shadow-[1px_1px_0px_0px_black] ${bgColors} ${className}`}
      />
    );
  }

  if (type === 'square') {
    return (
      <div
        className={`w-3.5 h-3.5 rounded-none border border-black dark:border-white shadow-[1px_1px_0px_0px_black] ${bgColors} ${className}`}
      />
    );
  }

  return (
    <div className={`w-3.5 h-3.5 relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
        <polygon
          points="12,2 22,22 2,22"
          fill={color === 'yellow' ? '#F0C020' : color === 'red' ? '#D02020' : '#1040C0'}
          stroke="currentColor"
          strokeWidth="2"
          className="text-black dark:text-white"
        />
      </svg>
    </div>
  );
};

export const BauhausCompositionHero: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-48 h-48 select-none pointer-events-none ${className}`}>
      {/* Overlapping Blue Circle */}
      <div className="absolute top-2 left-2 w-32 h-32 rounded-full bg-[#1040C0] border-4 border-black shadow-[6px_6px_0px_0px_black] opacity-90" />
      
      {/* Overlapping Rotated Red Square */}
      <div className="absolute bottom-2 right-4 w-28 h-28 bg-[#D02020] border-4 border-black shadow-[6px_6px_0px_0px_black] rotate-12 opacity-95 flex items-center justify-center">
        {/* Inner Yellow Circle */}
        <div className="w-10 h-10 rounded-full bg-[#F0C020] border-2 border-black" />
      </div>

      {/* Overlapping Yellow Triangle */}
      <div className="absolute top-8 right-2 w-24 h-24">
        <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <polygon
            points="12,2 22,22 2,22"
            fill="#F0C020"
            stroke="#121212"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Grid Pattern Element */}
      <div className="absolute bottom-0 left-4 w-16 h-8 border-2 border-black bg-white shadow-[3px_3px_0px_0px_black] flex items-center justify-around px-1">
        <div className="w-2 h-2 rounded-full bg-black" />
        <div className="w-2 h-2 rounded-none bg-[#D02020]" />
        <div className="w-2 h-2 rounded-full bg-[#1040C0]" />
      </div>
    </div>
  );
};
