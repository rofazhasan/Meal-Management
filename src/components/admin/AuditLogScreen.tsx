import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Clock, User, Filter } from 'lucide-react';
import { AuditLog, User as UserType } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { MockService } from '../../services/mockStorage';

interface AuditLogScreenProps {
  users: UserType[];
}

export const AuditLogScreen: React.FC<AuditLogScreenProps> = ({ users }) => {
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  useEffect(() => {
    MockService.getAudits().then(setAudits);
  }, []);

  const filteredAudits = audits.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const getUserName = (userId?: string) => {
    if (!userId) return 'System';
    const found = users.find(u => u.id === userId);
    return found ? found.name : userId;
  };

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto animate-scale-in">
      
      {/* Header */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            অ্যাডমিন অডিট ট্রেইল ও অ্যাক্টিভিটি লগ
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            ম্যানেজার ও সিস্টেমের নিরাপত্তা ও সিকিউরিটি অ্যাকশন হিস্ট্রি ট্র্যাকার
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="py-2.5 px-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
          >
            <option value="ALL">সকল অ্যাকশন</option>
            <option value="USER_APPROVED">ইউজার অনুমোদন</option>
            <option value="USER_REJECTED">ইউজার বাতিল</option>
            <option value="RATE_UPDATE">রেট আপডেট</option>
            <option value="RECHARGE">পার্স রিচার্জ</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 space-y-4 shadow-xl">
        {filteredAudits.length === 0 ? (
          <EmptyState
            icon="alert"
            title="কোনো অডিট লগ পাওয়া যায়নি"
            description="সকল প্রশাসনিক কর্মকাণ্ড এখানে সংরক্ষিত হয়।"
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 uppercase text-[10px] text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="p-3.5">সময়সূচি</th>
                  <th className="p-3.5">অ্যাডমিন</th>
                  <th className="p-3.5">অ্যাকশন</th>
                  <th className="p-3.5">টার্গেট ইউজার</th>
                  <th className="p-3.5">বিস্তারিত তথ্য</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {filteredAudits.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{new Date(log.timestamp).toLocaleString('bn-BD')}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-200 font-sans">
                      {getUserName(log.adminId)}
                    </td>
                    <td className="p-3.5">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300 font-sans">
                      {getUserName(log.targetUserId)}
                    </td>
                    <td className="p-3.5 text-slate-200 font-medium font-sans">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
