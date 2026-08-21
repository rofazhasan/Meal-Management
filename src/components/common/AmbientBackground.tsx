import React from 'react';
import { CloudShader } from '../ui/cloud-shader';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Aceternity Cloud Shader GPU Layer */}
      <div className="absolute inset-0 opacity-20 dark:opacity-25 mix-blend-screen transition-opacity duration-1000">
        <CloudShader
          speed={0.6}
          count={5}
          cloudColor="#38bdf8"
          skyTopColor="#020617"
          skyBottomColor="#0f172a"
          className="h-full w-full"
        />
      </div>

      {/* Top Left Glowing Orb */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] animate-float-slow" />
      
      {/* Top Right Indigo Orb */}
      <div className="absolute top-10 -right-24 w-[28rem] h-[28rem] bg-indigo-600/15 rounded-full blur-[140px] animate-float-delayed" />
      
      {/* Middle Emerald Glow */}
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-[130px] animate-pulse-subtle" />
      
      {/* Bottom Amber Glow */}
      <div className="absolute -bottom-40 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-[150px] animate-float-slow" />

      {/* Modern Grid Overlay Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] dark:opacity-[0.03]" />

      {/* Radial Gradient Vignette Layer */}
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-slate-100/60 dark:to-[#050811]" />
    </div>
  );
};
