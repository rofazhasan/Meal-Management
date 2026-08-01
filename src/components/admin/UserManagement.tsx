import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Search, UserCheck, Eye, PlusCircle, Printer, FileText, X, CheckCircle, Shield, UserPlus, FileSpreadsheet, Trash2, FolderArchive, Download } from 'lucide-react';
import { User, UserType, ArchivedUserReplica } from '../../types';
import { BN } from '../../constants/banglaText';
import { StatusBadge } from '../common/StatusBadge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { MockService } from '../../services/mockStorage';

interface UserManagementProps {
  users: User[];
  currentAdmin?: User;
  onSelectUser: (user: User) => void;
  onRefreshData: () => void;
}

const columnHelper = createColumnHelper<User>();

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  currentAdmin,
  onSelectUser,
  onRefreshData,
}) => {
  const [globalFilter, setGlobalFilter] = useState('');
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMasterReportModal, setShowMasterReportModal] = useState(false);
  const [selectedReportUser, setSelectedReportUser] = useState<User | null>(null);
  
  // Archive Modal States
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archives, setArchives] = useState<ArchivedUserReplica[]>([]);
  const [selectedArchiveForPrint, setSelectedArchiveForPrint] = useState<ArchivedUserReplica | null>(null);

  const fetchArchives = async () => {
    const list = await MockService.getArchivedReplicas();
    setArchives(list);
  };

  const handleDeleteUser = async (user: User) => {
    if (confirm(`আপনি কি নিশ্চিত যে ${user.name} (${user.phone}) কে মেসে আর না থাকায় ডিলিট করতে চান?\n\nডিলিটের পূর্বে সম্পূর্ণ মাসের মিল ও লেনদেনের বিস্তারিত একটি ফাইল ব্যাকআপ ফাইল আর্কাইভ তৈরি করা হবে, যা পরে যেকোনো সময় প্রিন্ট বা ডাউনলোড করা যাবে।`)) {
      try {
        await MockService.deleteUserWithArchive(currentAdmin?.id || 'admin', user.id);
        alert(`মেম্বার ${user.name} সফলভাবে ক্লাউড থেকে ডিলিট করা হয়েছে এবং ফাইল আর্কাইভ সেভ করা হয়েছে।`);
        onRefreshData();
        fetchArchives();
      } catch (err: any) {
        alert(err.message || 'ডিলিট করতে সমস্যা হয়েছে');
      }
    }
  };

  // Form State for Admin Account Creation
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [userType, setUserType] = useState<UserType>('PERMANENT');
  const [accountRole, setAccountRole] = useState<'USER' | 'ADMIN'>('USER');
  const [initialBalance, setInitialBalance] = useState<number>(500);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleToggleRole = async (targetUser: User, newRole: 'USER' | 'ADMIN') => {
    const roleText = newRole === 'ADMIN' ? 'এডমিন' : 'সাধারণ ইউজার';
    if (confirm(`আপনি কি নিশ্চিত যে ${targetUser.name} কে ${roleText} রোলে পরিবর্তন করতে চান?`)) {
      try {
        await MockService.updateUserRole(currentAdmin?.id || 'admin', targetUser.id, newRole);
        alert(`${targetUser.name} কে সফলভাবে ${roleText} রোলে পরিবর্তন করা হয়েছে!`);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || 'রোল পরিবর্তন করতে সমস্যা হয়েছে');
      }
    }
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const adminId = currentAdmin?.id || 'admin';
      await MockService.createAccountByAdmin(adminId, {
        name,
        phone,
        password,
        userType,
        initialBalance,
        role: accountRole,
      });
      alert(`সফলভাবে নতুন (${accountRole === 'ADMIN' ? 'এডমিন' : 'মেম্বার'}) ${name} একাউন্ট সক্রিয় করা হয়েছে!`);
      setShowCreateModal(false);
      setName('');
      setPhone('');
      setPassword('123456');
      setAccountRole('USER');
      setInitialBalance(500);
      onRefreshData();
    } catch (err: any) {
      setFormError(err.message || 'অ্যাকাউন্ট তৈরিতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintMasterReport = () => {
    window.print();
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'নাম ও ফোন',
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
              {info.getValue().charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-100 font-sans">{info.getValue()}</p>
              <p className="text-[11px] text-slate-400 font-mono">{info.row.original.phone}</p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('userType', {
        header: 'সদস্যের ধরণ',
        cell: (info) => <StatusBadge userType={info.getValue()} />,
      }),
      columnHelper.accessor('status', {
        header: 'স্ট্যাটাস',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('walletBalance', {
        header: 'পার্স ব্যালেন্স',
        cell: (info) => (
          <span className={`font-bold font-mono text-xs ${info.getValue() < 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
            <AnimatedNumber value={info.getValue()} prefix={BN.tkSymbol} decimals={0} />
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'একশন',
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectUser(info.row.original)}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
              title="ডিটেইলস ও ম্যানেজমেন্ট"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ডিটেইলস</span>
            </button>
            <button
              onClick={() => setSelectedReportUser(info.row.original)}
              className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
              title="সদস্যের মিল ও ব্যালেন্স রিপোর্ট"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>রিপোর্ট</span>
            </button>

            {/* Role Switcher Action */}
            {info.row.original.role === 'ADMIN' || info.row.original.role === 'SUPERADMIN' ? (
              <button
                onClick={() => handleToggleRole(info.row.original, 'USER')}
                className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
                title="ইউজার রোলে পরিবর্তন করুন"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>ইউজার করুন</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleRole(info.row.original, 'ADMIN')}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
                title="এডমিনে রূপান্তর করুন"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>👑 এডমিন করুন</span>
              </button>
            )}

            <button
              onClick={() => handleDeleteUser(info.row.original)}
              className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
              title="মেম্বার ডিলিট করুন এবং ফাইল ব্যাকআপ সেভ করুন"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ডিলিট</span>
            </button>
          </div>
        ),
      }),
    ],
    [onSelectUser, currentAdmin]
  );

  const table = useReactTable({
    data: users,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalWalletSum = users.reduce((sum, u) => sum + u.walletBalance, 0);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto animate-scale-in">
      
      {/* Header & Controls Bar */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xl">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <UserCheck className="w-5 h-5 text-cyan-400" />
            </div>
            {BN.users} ও মেম্বার একাউন্ট হাব
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            মোট রেজিস্টার্ড সদস্য: <span className="font-mono font-bold text-cyan-300">{users.length}</span> জন | মোট ফান্ড: <span className="font-mono font-bold text-emerald-400">৳{totalWalletSum}</span>
          </p>
        </div>

        {/* Action Buttons & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Create User Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95 font-display"
          >
            <UserPlus className="w-4 h-4" />
            <span>নতুন মেম্বার যুক্ত করুন</span>
          </button>

          {/* Master Report Button */}
          <button
            onClick={() => setShowMasterReportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-purple-500/30 text-purple-300 font-bold text-xs transition-all shadow-md active:scale-95 font-display"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-400" />
            <span>মেসের মাস্টার রিপোর্ট</span>
          </button>

          {/* Archived Members Button */}
          <button
            onClick={() => {
              fetchArchives();
              setShowArchiveModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all shadow-md active:scale-95 font-display"
          >
            <FolderArchive className="w-4 h-4 text-amber-400" />
            <span>আর্কাইভ ফাইল মেমো</span>
          </button>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={BN.searchUser}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
        {table.getRowModel().rows.length === 0 ? (
          <EmptyState
            icon="alert"
            title="কোনো সদস্য পাওয়া যায়নি"
            description="আপনার সার্চ কোয়েরি অনুযায়ী কোনো ইউজারের ডাটা মিলছে না।"
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 uppercase text-[10px] text-slate-400 border-b border-slate-800 font-mono">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="p-3.5 font-bold">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/60 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. MODAL: Admin Create Account */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 max-w-lg w-full shadow-2xl space-y-5 animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">নতুন মেম্বার একাউন্ট তৈরি</h3>
                  <p className="text-xs text-slate-400">অ্যাডমিন সরাসরি নতুন সদস্য একাউন্ট সক্রিয় করতে পারবেন</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleCreateAccountSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">সদস্যের পূর্ণ নাম *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: মোঃ সাকিব হাসান"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">মোবাইল নম্বর *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01711111111"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">পাসওয়ার্ড *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">অ্যাকাউন্ট রোল</label>
                  <select
                    value={accountRole}
                    onChange={(e) => setAccountRole(e.target.value as any)}
                    className="w-full bg-slate-900/90 border border-amber-500/40 rounded-xl py-2.5 px-2.5 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="USER">👤 সাধারণ ইউজার</option>
                    <option value="ADMIN">👑 মেস এডমিন (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">সদস্যের ধরণ</label>
                  <select
                    value={userType}
                    onChange={(e) => setUserType(e.target.value as UserType)}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-2.5 px-3 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="PERMANENT">স্থায়ী সদস্য</option>
                    <option value="GUEST">অতিথি সদস্য</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">প্রারম্ভিক জমা (৳)</label>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold shadow-lg shadow-cyan-500/20 active:scale-95 font-display"
                >
                  {submitting ? 'তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL: All Members Master Report */}
      {showMasterReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 max-w-4xl w-full shadow-2xl space-y-6 animate-scale-in my-8 print:border-none print:shadow-none print:bg-white print:text-black">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:border-black">
              <div>
                <h3 className="text-xl font-extrabold text-white font-display print:text-black">
                  📋 মেসের সকল সদস্যদের মাস্টার রিপোর্ট
                </h3>
                <p className="text-xs text-slate-400 print:text-gray-600">মেস ম্যানেজমেন্ট সিস্টেম | সার্বিক ব্যালেন্স ও মেম্বার তথ্য</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handlePrintMasterReport}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 text-xs font-bold transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button onClick={() => setShowMasterReportModal(false)} className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Master Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 print:border-gray-300">
                <span className="text-slate-400 print:text-gray-600 block">মোট মেম্বার</span>
                <span className="text-lg font-bold text-white print:text-black font-mono">{users.length} জন</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 print:border-gray-300">
                <span className="text-slate-400 print:text-gray-600 block">মোট ব্যালেন্স ফান্ড</span>
                <span className="text-lg font-bold text-emerald-400 print:text-black font-mono">৳{totalWalletSum}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 print:border-gray-300">
                <span className="text-slate-400 print:text-gray-600 block">অনুমোদিত অ্যাকাউন্ট</span>
                <span className="text-lg font-bold text-cyan-400 print:text-black font-mono">{users.filter(u => u.status === 'APPROVED').length} জন</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 print:border-gray-300">
                <span className="text-slate-400 print:text-gray-600 block">অপেক্ষমাণ আবেদন</span>
                <span className="text-lg font-bold text-amber-400 print:text-black font-mono">{users.filter(u => u.status === 'PENDING').length} জন</span>
              </div>
            </div>

            {/* Master Member Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-gray-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-300 uppercase text-[10px] font-mono border-b border-slate-800 print:bg-gray-100 print:text-black print:border-gray-300">
                  <tr>
                    <th className="p-3 font-bold">ক্রঃ</th>
                    <th className="p-3 font-bold">নাম ও ফোন</th>
                    <th className="p-3 font-bold">রুম</th>
                    <th className="p-3 font-bold">ধরণ</th>
                    <th className="p-3 font-bold">স্ট্যাটাস</th>
                    <th className="p-3 font-bold text-right">পার্স ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                  {users.map((u, index) => (
                    <tr key={u.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                      <td className="p-3 font-mono text-slate-400 print:text-black">{index + 1}</td>
                      <td className="p-3 font-bold text-white print:text-black">
                        {u.name}
                        <span className="block text-[10px] text-slate-400 print:text-gray-600 font-normal font-mono">{u.phone}</span>
                      </td>
                      <td className="p-3 text-slate-300 print:text-black">{u.userType === 'PERMANENT' ? 'স্থায়ী' : 'অতিথি'}</td>
                      <td className="p-3 text-slate-300 print:text-black">{u.status}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400 print:text-black">৳{u.walletBalance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL: Single User Detailed Report */}
      {selectedReportUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 max-w-lg w-full shadow-2xl space-y-5 animate-scale-in my-8 print:border-none print:shadow-none print:bg-white print:text-black">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:border-gray-300">
              <div>
                <h3 className="text-lg font-bold text-white font-display print:text-black">
                  📄 {selectedReportUser.name}-এর মেস রিপোর্ট
                </h3>
                <p className="text-xs text-slate-400 print:text-gray-600">ফোন: {selectedReportUser.phone}</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handlePrintMasterReport}
                  className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-bold transition"
                  title="মেমো প্রিন্ট করুন"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setSelectedReportUser(null)} className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between print:border-gray-300">
                <span className="text-slate-300 print:text-black">বর্তমান ওয়ালেট ব্যালেন্স:</span>
                <span className="text-lg font-bold font-mono text-emerald-400 print:text-black">৳{selectedReportUser.walletBalance}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between print:border-gray-300">
                <span className="text-slate-300 print:text-black">সদস্যের ধরণ:</span>
                <span className="font-bold text-cyan-300 print:text-black">{selectedReportUser.userType === 'PERMANENT' ? 'স্থায়ী সদস্য' : 'অতিথি সদস্য'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between print:border-gray-300">
                <span className="text-slate-300 print:text-black">ইনডেফিনিট মিল পজ স্ট্যাটাস:</span>
                <span className={`font-bold ${selectedReportUser.isIndefinitelyPaused ? 'text-amber-400' : 'text-emerald-400'} print:text-black`}>
                  {selectedReportUser.isIndefinitelyPaused ? 'পজ অন (বন্ধ)' : 'সক্রিয় (অন)'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-center print:border-gray-300">
              <p className="text-[11px] text-slate-400 print:text-gray-600">মেস এডমিন অনুমোদিত অফিশিয়াল অ্যাকাউন্ট রিপোর্ট মেমো</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: Archived Members Replica List */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 max-w-3xl w-full shadow-2xl space-y-5 animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <FolderArchive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white font-display">
                    📁 ডিলিট করা সদস্যের ফাইল আর্কাইভ রেপ্লিকা ({archives.length} টি)
                  </h3>
                  <p className="text-xs text-slate-400">মেস ছেড়ে যাওয়া বা নিষ্ক্রিয় সদস্যদের ফাইল ব্যাকআপ ও মাসিক স্টেটমেন্ট</p>
                </div>
              </div>
              <button onClick={() => setShowArchiveModal(false)} className="p-2 rounded-2xl bg-slate-900 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {archives.length === 0 ? (
              <EmptyState
                icon="alert"
                title="কোনো ফাইল আর্কাইভ পাওয়া যায়নি"
                description="কোনো সদস্য ডিলিট করা হলে তার সমস্ত রেকর্ড স্বয়ংক্রিয়ভাবে এখানে ফাইল আর্কাইভ হয়ে জমা থাকবে।"
              />
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {archives.map((arch) => (
                  <div key={arch.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm font-display">{arch.userName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                          {arch.userMobile}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {arch.userType === 'PERMANENT' ? 'স্থায়ী' : 'অতিথি'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        ডিলিট তারিখ: {new Date(arch.deletedAt).toLocaleDateString('bn-BD')} | মোট মিল: {arch.totalMealsCount} টি | খরচ: ৳{arch.totalMoneySpent}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedArchiveForPrint(arch)}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 font-bold text-[11px] flex items-center gap-1.5 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>স্টেটমেন্ট মেমো প্রিন্ট</span>
                      </button>

                      <button
                        onClick={() => {
                          const blob = new Blob([arch.replicaDataJson], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `user_archive_${arch.userName}_${arch.originalUserId}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 font-bold text-[11px] flex items-center gap-1.5 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>JSON ডাউনলোড</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL: Printable Archive Statement Memo */}
      {selectedArchiveForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 max-w-2xl w-full shadow-2xl space-y-6 animate-scale-in my-8 print:border-none print:shadow-none print:bg-white print:text-black print:p-0">
            
            {/* Header & Action */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:hidden">
              <h3 className="text-lg font-bold text-white font-display">
                🖨️ ডিলিট করা সদস্যের পূর্ণাঙ্গ মাসের ফাইল মেমো প্রিন্ট
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট মেমো</span>
                </button>
                <button onClick={() => setSelectedArchiveForPrint(null)} className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Memo Sheet */}
            <div className="space-y-5 text-xs">
              <div className="border-b-2 border-slate-700 print:border-black pb-4 text-center">
                <h1 className="text-2xl font-black text-cyan-400 print:text-black font-display uppercase tracking-wider">
                  মেস ডাইনিং - পূর্ববর্তী সদস্যের অফিশিয়াল স্টেটমেন্ট
                </h1>
                <p className="text-xs text-slate-400 print:text-gray-600 mt-1">আর্কাইভ ফাইল মেমো | ডিলিট তারিখ: {new Date(selectedArchiveForPrint.deletedAt).toLocaleString('bn-BD')}</p>
              </div>

              {/* Member Details */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 print:border-gray-300 grid grid-cols-2 gap-3 font-sans">
                <div>
                  <span className="text-slate-400 print:text-gray-600 block">সদস্যের নাম:</span>
                  <span className="font-bold text-white print:text-black text-sm">{selectedArchiveForPrint.userName}</span>
                </div>
                <div>
                  <span className="text-slate-400 print:text-gray-600 block">মোবাইল নম্বর:</span>
                  <span className="font-bold text-white print:text-black font-mono text-sm">{selectedArchiveForPrint.userMobile}</span>
                </div>
                <div>
                  <span className="text-slate-400 print:text-gray-600 block">সদস্যের ধরণ:</span>
                  <span className="font-bold text-cyan-300 print:text-black">{selectedArchiveForPrint.userType === 'PERMANENT' ? 'স্থায়ী সদস্য' : 'অতিথি সদস্য'}</span>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 print:border-gray-300 text-center">
                  <span className="text-slate-400 print:text-gray-600 block">মোট খাওয়া মিল</span>
                  <span className="text-lg font-bold text-cyan-400 print:text-black font-mono">{selectedArchiveForPrint.totalMealsCount} টি</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 print:border-gray-300 text-center">
                  <span className="text-slate-400 print:text-gray-600 block">মোট মিল খরচ</span>
                  <span className="text-lg font-bold text-rose-400 print:text-black font-mono">৳{selectedArchiveForPrint.totalMoneySpent}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 print:border-gray-300 text-center">
                  <span className="text-slate-400 print:text-gray-600 block">ফাইনাল ব্যালেন্স</span>
                  <span className="text-lg font-bold text-emerald-400 print:text-black font-mono">৳{selectedArchiveForPrint.walletBalanceAtDeletion}</span>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div>
                <h4 className="font-bold text-slate-200 print:text-black mb-2">লেনদেন রেজিস্টার (Transactions History):</h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-gray-300">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-slate-300 print:bg-gray-100 print:text-black font-mono">
                      <tr>
                        <th className="p-2">তারিখ</th>
                        <th className="p-2">ধরণ</th>
                        <th className="p-2">বিবরণ</th>
                        <th className="p-2 text-right">পরিমাণ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                      {selectedArchiveForPrint.transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="p-2 font-mono text-slate-400 print:text-black">{new Date(tx.date).toLocaleDateString('bn-BD')}</td>
                          <td className="p-2 font-bold text-slate-200 print:text-black">{tx.type}</td>
                          <td className="p-2 text-slate-300 print:text-black">{tx.description}</td>
                          <td className="p-2 text-right font-mono font-bold text-cyan-300 print:text-black">৳{tx.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-10 flex justify-between items-center text-[11px] text-slate-400 print:text-black font-sans">
                <div className="text-center border-t border-slate-700 print:border-black pt-2 w-36">
                  সদস্যের স্বাক্ষর
                </div>
                <div className="text-center border-t border-slate-700 print:border-black pt-2 w-36">
                  মেস এডমিনের স্বাক্ষর
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
