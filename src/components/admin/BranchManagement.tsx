import React, { useState } from 'react';
import { Building2, Plus, CheckCircle, MapPin, Phone, Users, Shield, ArrowRight } from 'lucide-react';
import { Branch } from '../../types';

interface BranchManagementProps {
  branches: Branch[];
}

export const BranchManagement: React.FC<BranchManagementProps> = ({ branches }) => {
  const [branchList, setBranchList] = useState<Branch[]>(branches);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('ঢাকা');
  const [address, setAddress] = useState('');

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    const newB: Branch = {
      id: 'b_' + Date.now(),
      code: code.toUpperCase(),
      name,
      address,
      city,
      isActive: true,
    };
    setBranchList([...branchList, newB]);
    setName('');
    setCode('');
    setAddress('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 animate-scale-in pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              হোস্টেল ও ব্রাঞ্চ ম্যানেজমেন্ট (Multi-Branch)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            বিভিন্ন হোস্টেল ব্রাঞ্চের পৃথক ড্যাশবোর্ড, মিল সিডিউল এবং স্বাধীন প্রাইসিং রেট কাস্টমাইজ করুন
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ব্রাঞ্চ যুক্ত করুন</span>
        </button>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {branchList.map((branch) => (
          <div key={branch.id} className="glass-panel p-6 rounded-3xl border border-slate-800/80 hover:border-cyan-500/40 transition duration-300 relative group">
            <div className="flex items-center justify-between mb-4">
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/20">
                {branch.code}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle className="w-3 h-3" /> সক্রিয় ব্রাঞ্চ
              </span>
            </div>

            <h3 className="text-lg font-bold text-white font-display mb-1">{branch.name}</h3>

            <div className="space-y-1.5 text-xs text-slate-400 mb-6">
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{branch.address || 'ঠিকানা নির্ধারিত নেই'}, {branch.city}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>ব্রাঞ্চ ম্যানেজার: হাসান আহমেদ</span>
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">নিবন্ধিত রেসিডেন্ট: <strong className="text-white font-mono">১২০ জন</strong></span>
              <button className="text-cyan-400 font-bold flex items-center gap-1 hover:text-cyan-300 transition">
                <span>কনফিগার</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Branch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 max-w-md w-full space-y-5">
            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              নতুন ব্রাঞ্চ তৈরি করুন
            </h3>

            <form onSubmit={handleAddBranch} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">ব্রাঞ্চের নাম</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: সাউথ হোস্টেল উইং"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ব্রাঞ্চ কোড</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: SOUTH"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ঠিকানা</label>
                <input
                  type="text"
                  placeholder="যেমন: রোড ১২, সেক্টর ৬"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
