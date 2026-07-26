import React from 'react';
import { BN } from '../../constants/banglaText';
import { ApprovalStatus, UserType } from '../../types';

interface StatusBadgeProps {
  status?: ApprovalStatus;
  userType?: UserType;
  customText?: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, userType, customText, variant }) => {
  if (userType) {
    const isPerm = userType === 'PERMANENT';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm transition-all ${
        isPerm 
          ? 'bg-sky-500/10 text-sky-300 border-sky-500/30 shadow-sky-500/10' 
          : 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-amber-500/10'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isPerm ? 'bg-sky-400 animate-pulse' : 'bg-amber-400'}`} />
        {isPerm ? BN.permanentUser : BN.guestUser}
      </span>
    );
  }

  if (status) {
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          {BN.approved}
        </span>
      );
    }
    if (status === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          {BN.pending}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {BN.rejected}
      </span>
    );
  }

  const variantStyles = {
    success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-amber-500/10',
    danger: 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-rose-500/10',
    info: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-cyan-500/10',
    neutral: 'bg-slate-800/60 text-slate-300 border-slate-700/60 shadow-slate-900/10',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm ${variantStyles[variant || 'neutral']}`}>
      {customText}
    </span>
  );
};
