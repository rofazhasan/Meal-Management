import React from 'react';
import { Utensils, Wallet, Calendar, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'meal' | 'wallet' | 'calendar' | 'alert';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'meal',
  title,
  description,
  actionText,
  onAction,
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'wallet':
        return <Wallet className="w-8 h-8 text-emerald-400" />;
      case 'calendar':
        return <Calendar className="w-8 h-8 text-cyan-400" />;
      case 'alert':
        return <AlertCircle className="w-8 h-8 text-amber-400" />;
      case 'meal':
      default:
        return <Utensils className="w-8 h-8 text-sky-400" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center glass-card rounded-2xl border border-slate-800/80 my-4 animate-scale-in">
      <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center mb-4 shadow-lg shadow-cyan-950/30 relative group">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-sky-500/0 rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
        {getIcon()}
      </div>

      <h3 className="text-base font-bold text-slate-100 mb-1 font-display">
        {title}
      </h3>
      <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
        {description}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/20 active:scale-95 flex items-center gap-2"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
