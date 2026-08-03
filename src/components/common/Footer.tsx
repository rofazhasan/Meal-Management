import React from 'react';
import { Heart, Mail, Facebook, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-6 px-4 mt-auto border-t border-slate-800/80 bg-slate-950/70 backdrop-blur-md relative z-20 print:hidden">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        
        {/* Made with Love credit */}
        <div className="flex items-center gap-1.5 text-slate-300 font-sans">
          <span>Made with</span>
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
          <span>by</span>
          <span className="font-bold text-cyan-300 hover:text-cyan-200 transition-colors font-display">
            Md. Rofaz Hasan Rafiu
          </span>
        </div>

        {/* Contact & Social Links */}
        <div className="flex items-center gap-4 text-slate-400">
          
          {/* Facebook Link */}
          <a
            href="https://www.facebook.com/rofazhasanrafiu/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 transition-all group"
          >
            <Facebook className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-[11px]">Facebook</span>
            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>

          {/* Email Link */}
          <a
            href="mailto:mdrofazhasanrafiu@gmail.com"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 transition-all group"
          >
            <Mail className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-[11px]">mdrofazhasanrafiu@gmail.com</span>
          </a>

        </div>

      </div>
    </footer>
  );
};
