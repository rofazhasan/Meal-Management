'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Search, UserCheck, Eye, PlusCircle, Printer, FileText, X, CheckCircle, Shield, UserPlus, FileSpreadsheet, Trash2, FolderArchive, Download, KeyRound, Crown, Users, Filter, CheckSquare, Square, RefreshCw, Sparkles, ShieldAlert, Wallet } from 'lucide-react';
import { User, UserType, ArchivedUserReplica } from '../../types';
import { BN } from '../../constants/banglaText';
import { StatusBadge } from '../common/StatusBadge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { ApiService } from '../../services/apiService';

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
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RESET_REQUESTED'>('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkActioning, setBulkActioning] = useState(false);
  
  // Permission checks
  const isSuperAdmin = currentAdmin?.role === 'SUPERADMIN';
  const isAdminOrAbove = isSuperAdmin || currentAdmin?.role === 'ADMIN' || currentAdmin?.role === 'OWNER';

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMasterReportModal, setShowMasterReportModal] = useState(false);
  const [showDuesReportModal, setShowDuesReportModal] = useState(false);
  const [selectedReportUser, setSelectedReportUser] = useState<User | null>(null);
  
  // Archive Modal States
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archives, setArchives] = useState<ArchivedUserReplica[]>([]);
  const [selectedArchiveForPrint, setSelectedArchiveForPrint] = useState<ArchivedUserReplica | null>(null);

  // Filtered list based on role & status filters
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter === 'ADMIN' && !(u.role === 'ADMIN' || u.role === 'SUPERADMIN')) return false;
      if (roleFilter === 'USER' && (u.role === 'ADMIN' || u.role === 'SUPERADMIN')) return false;
      if (statusFilter === 'RESET_REQUESTED' && !u.isPasswordResetRequested) return false;
      return true;
    });
  }, [users, roleFilter, statusFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUserRow = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const fetchArchives = async () => {
    const list = await ApiService.getArchivedReplicas();
    setArchives(list);
  };

  const handleDeleteUser = async (user: User) => {
    if (!isAdminOrAbove) {
      alert('অ্যাক্সেস নম্বর সমস্যা: ইউজার মোছার ক্ষমতা শুধুমাত্র এডমিনের রয়েছে।');
      return;
    }
    if (confirm(`আপনি কি নিশ্চিত যে ${user.name} (${user.phone}) কে মেসে আর না থাকায় ডিলিট করতে চান?\n\nডিলিটের পূর্বে সম্পূর্ণ মাসের মিল ও লেনদেনের বিস্তারিত একটি ফাইল ব্যাকআপ ফাইল আর্কাইভ তৈরি করা হবে, যা পরে যেকোনো সময় প্রিন্ট বা ডাউনলোড করা যাবে।`)) {
      try {
        await ApiService.deleteUserWithArchive(currentAdmin?.id || 'admin', user.id);
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
    if (!isAdminOrAbove) {
      alert('অ্যাক্সেস নম্বর সমস্যা: রোল পরিবর্তনের অনুমতি শুধুমাত্র অ্যাডমিনদের রয়েছে।');
      return;
    }
    const roleText = newRole === 'ADMIN' ? 'এডমিন' : 'সাধারণ ইউজার';
    if (confirm(`আপনি কি নিশ্চিত যে ${targetUser.name} কে ${roleText} রোলে পরিবর্তন করতে চান?`)) {
      try {
        await ApiService.updateUserRole(currentAdmin?.id || 'admin', targetUser.id, newRole);
        alert(`${targetUser.name} কে সফলভাবে ${roleText} রোলে পরিবর্তন করা হয়েছে!`);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || 'রোল পরিবর্তন করতে সমস্যা হয়েছে');
      }
    }
  };

  const handleResetPassword = async (targetUser: User) => {
    if (!isAdminOrAbove) {
      alert('অ্যাক্সেস নম্বর সমস্যা: পাসওয়ার্ড রিসেট করার ক্ষমতা শুধুমাত্র অ্যাডমিনের রয়েছে।');
      return;
    }
    if (confirm(`আপনি কি নিশ্চিত যে ${targetUser.name} (${targetUser.phone}) এর পাসওয়ার্ড রিসেট করে '123' সেট করতে চান?`)) {
      try {
        await ApiService.approvePasswordReset(currentAdmin?.id || 'admin', targetUser.id, '123');
        alert(`${targetUser.name} এর পাসওয়ার্ড সফলভাবে রিসেট করে '123' করা হয়েছে!`);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে');
      }
    }
  };

  const handleBulkResetPassword = async () => {
    if (selectedUserIds.length === 0) return;
    if (confirm(`আপনি কি নিশ্চিত যে সিলেক্ট করা ${selectedUserIds.length} জন ইউজারের পাসওয়ার্ড রিসেট করে '123' সেট করতে চান?`)) {
      setBulkActioning(true);
      try {
        const adminId = currentAdmin?.id || 'admin';
        for (const userId of selectedUserIds) {
          await ApiService.approvePasswordReset(adminId, userId, '123');
        }
        alert(`সফলভাবে ${selectedUserIds.length} জন মেম্বারের পাসওয়ার্ড রিসেট করে '123' করা হয়েছে!`);
        setSelectedUserIds([]);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || 'বাল্ক পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে');
      } finally {
        setBulkActioning(false);
      }
    }
  };

  const handleBulkToggleRole = async (targetRole: 'ADMIN' | 'USER') => {
    if (selectedUserIds.length === 0) return;
    const roleText = targetRole === 'ADMIN' ? 'এডমিন' : 'সাধারণ ইউজার';
    if (confirm(`আপনি কি নিশ্চিত যে সিলেক্ট করা ${selectedUserIds.length} জন ইউজারকে ${roleText} রোলে রূপান্তর করতে চান?`)) {
      setBulkActioning(true);
      try {
        const adminId = currentAdmin?.id || 'admin';
        for (const userId of selectedUserIds) {
          await ApiService.updateUserRole(adminId, userId, targetRole);
        }
        alert(`সফলভাবে ${selectedUserIds.length} জন ইউজারকে ${roleText} রোলে রূপান্তর করা হয়েছে!`);
        setSelectedUserIds([]);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || 'বাল্ক রোল পরিবর্তন করতে সমস্যা হয়েছে');
      } finally {
        setBulkActioning(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (confirm(`⚠️ সাবধান! আপনি কি নিশ্চিত যে সিলেক্ট করা ${selectedUserIds.length} জন সদস্য মুছে ফেলতে চান?`)) {
      setBulkActioning(true);
      try {
        const adminId = currentAdmin?.id || 'admin';
        for (const userId of selectedUserIds) {
          await ApiService.deleteUserWithArchive(adminId, userId);
        }
        alert(`সফলভাবে ${selectedUserIds.length} জন সদস্য ডিলিট করা হয়েছে!`);
        setSelectedUserIds([]);
        onRefreshData();
        fetchArchives();
      } catch (err: any) {
        alert(err.message || 'বাল্ক ইউজার ডিলিট করতে সমস্যা হয়েছে');
      } finally {
        setBulkActioning(false);
      }
    }
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const adminId = currentAdmin?.id || 'admin';
      await ApiService.createAccountByAdmin(adminId, {
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

  const [seeding, setSeeding] = useState(false);
  const [purging, setPurging] = useState(false);

  const handleSeed300Users = async () => {
    if (!isSuperAdmin) {
      alert('অ্যাক্সেস নম্বর সমস্যা: শুধুমাত্র সুপারঅ্যাডমিন সিস্টেমে ৩০০ জন টেস্ট ইউজার একসাথে তৈরি করতে পারবেন।');
      return;
    }
    if (confirm('👑 [সুপারএডমিন স্পেশাল সেটিং]\n\nআপনি কি টেস্ট করার জন্য সিস্টেমে ৩০০ জন টেস্ট মেম্বার ডাটাবেজে এক সাথে তৈরি করতে চান?')) {
      setSeeding(true);
      try {
        const count = await ApiService.seed300TestUsers('SUPERADMIN');
        alert(`সফলভাবে ${count} জন টেস্ট ইউজার ডাটাবেজে সেটিং করা হয়েছে!`);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || 'টেস্ট ইউজার তৈরি করতে সমস্যা হয়েছে');
      } finally {
        setSeeding(false);
      }
    }
  };

  const handleDelete300Users = async () => {
    if (!isAdminOrAbove) {
      alert('অ্যাক্সেস নম্বর সমস্যা: টেস্ট ইউজার মুছে ফেলার ক্ষমতা শুধুমাত্র এডমিনদের রয়েছে।');
      return;
    }
    if (confirm('⚠️ সাবধান! আপনি কি নিশ্চিত যে অ্যাডমিন একাউন্ট ছাড়া বাকি সকল (৩০০ জন) টেস্ট ইউজার মুছে ফেলতে চান?\n\nমেসের শুধুমাত্র মেস অ্যাডমিন একাউন্টই অবশিষ্ট থাকবে।')) {
      setPurging(true);
      try {
        const count = await ApiService.deleteAllTestUsersExceptAdmin(currentAdmin?.role || 'ADMIN');
        alert(`সফলভাবে ${count} জন টেস্ট ইউজার মুছে ফেলা হয়েছে! এখন শুধু অ্যাডমিন একাউন্ট রয়েছে।`);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || 'ইউজার ডিলিট করতে সমস্যা হয়েছে');
      } finally {
        setPurging(false);
      }
    }
  };

  const adminCount = useMemo(() => users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPERADMIN').length, [users]);
  const resetCount = useMemo(() => users.filter((u) => u.isPasswordResetRequested).length, [users]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
          />
        ),
        cell: (info) => (
          <input
            type="checkbox"
            checked={selectedUserIds.includes(info.row.original.id)}
            onChange={() => handleSelectUserRow(info.row.original.id)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
          />
        ),
      }),
      columnHelper.accessor('name', {
        header: 'নাম ও ফোন',
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              {info.getValue().charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-slate-100 font-sans">{info.getValue()}</p>
                {(info.row.original.role === 'SUPERADMIN' || info.row.original.role === 'ADMIN') && (
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-mono">
                    👑 ADMIN
                  </span>
                )}
              </div>
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
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={info.getValue()} />
            {info.row.original.isPasswordResetRequested && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1 font-mono">
                <KeyRound className="w-3 h-3 text-amber-400" />
                রিসেট অনুরোধ
              </span>
            )}
          </div>
        ),
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
          <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap min-w-[280px]">
            <button
              onClick={() => onSelectUser(info.row.original)}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm whitespace-nowrap"
              title="ডিটেইলস ও ম্যানেজমেন্ট"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ডিটেইলস</span>
            </button>
            <button
              onClick={() => setSelectedReportUser(info.row.original)}
              className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm whitespace-nowrap"
              title="সদস্যের মিল ও ব্যালেন্স রিপোর্ট"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>রিপোর্ট</span>
            </button>

            {/* Role Switcher Action */}
            {info.row.original.role === 'ADMIN' || info.row.original.role === 'SUPERADMIN' ? (
              <button
                onClick={() => handleToggleRole(info.row.original, 'USER')}
                disabled={!isAdminOrAbove}
                className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm whitespace-nowrap disabled:opacity-40"
                title="ইউজার রোলে পরিবর্তন করুন"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>ইউজার করুন</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleRole(info.row.original, 'ADMIN')}
                disabled={!isAdminOrAbove}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm whitespace-nowrap disabled:opacity-40"
                title="এডমিনে রূপান্তর করুন"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>👑 এডমিন করুন</span>
              </button>
            )}

            {/* Reset Password Action */}
            <button
              onClick={() => handleResetPassword(info.row.original)}
              disabled={!isAdminOrAbove}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm whitespace-nowrap disabled:opacity-40 ${
                info.row.original.isPasswordResetRequested
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 animate-pulse'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
              title="পাসওয়ার্ড রিসেট করে 123 করুন"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>{info.row.original.isPasswordResetRequested ? 'অনুমোদন (123)' : 'রিসেট (123)'}</span>
            </button>

            <button
              onClick={() => handleDeleteUser(info.row.original)}
              disabled={!isAdminOrAbove}
              className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-[11px] font-bold transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm whitespace-nowrap disabled:opacity-40"
              title="মেম্বার ডিলিট করুন এবং ফাইল ব্যাকআপ সেভ করুন"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ডিলিট</span>
            </button>
          </div>
        ),
      }),
    ],
    [filteredUsers, selectedUserIds, onSelectUser, currentAdmin, isAdminOrAbove]
  );

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  const totalWalletSum = Math.round(users.reduce((sum, u) => sum + u.walletBalance, 0) * 100) / 100;

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto animate-scale-in">
      
      {/* Top Stat Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-slate-900/60 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-cyan-400/90 font-mono uppercase tracking-wider">মোট মেম্বার</p>
            <h3 className="text-2xl font-black text-white font-mono mt-1">{users.length} <span className="text-xs text-slate-400 font-sans font-normal">জন</span></h3>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-slate-900/60 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-400/90 font-mono uppercase tracking-wider">মেস এডমিন</p>
            <h3 className="text-2xl font-black text-amber-300 font-mono mt-1">{adminCount} <span className="text-xs text-slate-400 font-sans font-normal">জন</span></h3>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Crown className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-slate-900/60 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-purple-400/90 font-mono uppercase tracking-wider">পাসওয়ার্ড রিসেট</p>
            <h3 className="text-2xl font-black text-purple-300 font-mono mt-1">{resetCount} <span className="text-xs text-slate-400 font-sans font-normal">অনুরোধ</span></h3>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-slate-900/60 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-400/90 font-mono uppercase tracking-wider">মোট ফান্ড</p>
            <h3 className="text-2xl font-black text-emerald-400 font-mono mt-1">৳{totalWalletSum}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

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
            প্রিমিয়াম অ্যাডমিন কন্ট্রোল সিস্টেম | আপনার লগইন রোল: <span className="font-mono font-bold text-amber-300">{currentAdmin?.role || 'USER'}</span>
          </p>
        </div>

        {/* Action Buttons & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seed 300 Test Users - RESTRICTED TO SUPERADMIN ONLY */}
          {isSuperAdmin && (
            <button
              onClick={handleSeed300Users}
              disabled={seeding}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 font-display border border-indigo-400/40 disabled:opacity-50"
              title="ইনস্পেকশনের জন্য ৩০০ জন টেস্ট ইউজার তৈরি করুন (শুধুমাত্র সুপারএডমিন)"
            >
              <Crown className="w-4 h-4 text-amber-300" />
              <span>{seeding ? 'তৈরি হচ্ছে...' : '৩০০ টেস্ট ইউজার সেটিং'}</span>
            </button>
          )}

          {/* Delete 300 Test Users - RESTRICTED TO ADMIN / SUPERADMIN */}
          {isAdminOrAbove && (
            <button
              onClick={handleDelete300Users}
              disabled={purging}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 font-display border border-rose-400/40 disabled:opacity-50"
              title="শুধু অ্যাডমিন রেখে বাকি ৩০০ ইউজার মুছে ফেলুন"
            >
              <Trash2 className="w-4 h-4 text-rose-200" />
              <span>{purging ? 'ডিলিট হচ্ছে...' : '৩০০ ইউজার ডিলিট (শুধু অ্যাডমিন)'}</span>
            </button>
          )}

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

          {/* Member Dues & Low Balance Report Button */}
          <button
            onClick={() => setShowDuesReportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-rose-500/30 text-rose-300 font-bold text-xs transition-all shadow-md active:scale-95 font-display"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>বকেয়া ও লো-ব্যালেন্স রিপোর্ট</span>
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

          {/* Filters & Search */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-xs rounded-2xl px-3 py-2.5 text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">সকল রোল</option>
              <option value="ADMIN">শুধুমাত্র এডমিন</option>
              <option value="USER">শুধুমাত্র মেম্বার</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-xs rounded-2xl px-3 py-2.5 text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">সকল স্ট্যাটাস</option>
              <option value="RESET_REQUESTED">পাসওয়ার্ড রিসেট অনুরোধ</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
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
      </div>

      {/* Bulk Action Floating Bar */}
      {selectedUserIds.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl border border-cyan-500/40 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shadow-2xl animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-cyan-300 font-mono font-bold">
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            <span>{selectedUserIds.length} জন ইউজার সিলেক্ট করা হয়েছে</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBulkResetPassword}
              disabled={bulkActioning || !isAdminOrAbove}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>বাল্ক রিসেট (123)</span>
            </button>

            <button
              onClick={() => handleBulkToggleRole('ADMIN')}
              disabled={bulkActioning || !isAdminOrAbove}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-emerald-400" />
              <span>বাল্ক এডমিন করুন</span>
            </button>

            <button
              onClick={() => handleBulkToggleRole('USER')}
              disabled={bulkActioning || !isAdminOrAbove}
              className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span>বাল্ক ইউজার করুন</span>
            </button>

            <button
              onClick={handleBulkDelete}
              disabled={bulkActioning || !isAdminOrAbove}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>বাল্ক ডিলিট</span>
            </button>
          </div>
        </div>
      )}

      {/* Data Table Container */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
        {table.getRowModel().rows.length === 0 ? (
          <EmptyState
            icon="alert"
            title="কোনো সদস্য পাওয়া যায়নি"
            description="আপনার সার্চ কোয়েরি অনুযায়ী কোনো ইউজারের ডাটা মিলছে না।"
          />
        ) : (
          <div className="space-y-4">
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

            {/* Pagination Bar */}
            {table.getPageCount() > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
                <div className="text-xs text-slate-400 font-mono">
                  দেখানো হচ্ছে <span className="font-bold text-cyan-300">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> - <span className="font-bold text-cyan-300">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}</span> (মোট <span className="font-bold text-cyan-300">{table.getFilteredRowModel().rows.length}</span> জন সদস্য)
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none font-mono"
                  >
                    {[10, 25, 50, 100, 300].map((pageSize) => (
                      <option key={pageSize} value={pageSize}>
                        প্রতি পেজে {pageSize} জন
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all active:scale-95"
                  >
                    পূর্ববর্তী
                  </button>

                  <span className="text-xs text-slate-400 font-mono font-bold px-2">
                    পেজ {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                  </span>

                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all active:scale-95"
                  >
                    পরবর্তী
                  </button>
                </div>
              </div>
            )}
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
            <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-black">
              <table className="w-full text-left text-xs border border-black border-collapse">
                <thead className="bg-slate-900/90 text-slate-300 uppercase text-[10px] font-mono border-b border-slate-800 print:bg-gray-100 print:text-black print:border-black">
                  <tr>
                    <th className="p-3 font-bold border border-black">ক্রঃ</th>
                    <th className="p-3 font-bold border border-black">মেম্বারের নাম ও ফোন</th>
                    <th className="p-3 font-bold border border-black">রুম ও সিট</th>
                    <th className="p-3 font-bold border border-black">ধরণ</th>
                    <th className="p-3 font-bold border border-black">স্ট্যাটাস</th>
                    <th className="p-3 font-bold text-right border border-black">ওয়ালেট ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {users.map((u, index) => (
                    <tr key={u.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                      <td className="p-3 font-mono text-slate-400 print:text-black border border-black">{index + 1}</td>
                      <td className="p-3 font-bold text-white print:text-black border border-black">
                        {u.name}
                        <span className="block text-[10px] text-slate-400 print:text-black font-normal font-mono">{u.phone}</span>
                      </td>
                      <td className="p-3 text-slate-300 print:text-black font-mono border border-black font-bold">
                        {u.profile?.roomNumber ? `রুম ${u.profile.roomNumber}` : 'N/A'} {u.profile?.seatNumber ? `(${u.profile.seatNumber})` : ''}
                      </td>
                      <td className="p-3 text-slate-300 print:text-black border border-black">{u.userType === 'PERMANENT' ? 'স্থায়ী' : 'অতিথি'}</td>
                      <td className="p-3 text-slate-300 print:text-black border border-black">{u.status === 'APPROVED' ? 'অনুমোদিত' : u.status}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400 print:text-black border border-black">৳{u.walletBalance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Printable Formal Signatures */}
            <div className="hidden print:block pt-10 mt-6 print-avoid-break border-t border-black">
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-t border-black pt-1 font-bold text-black w-48 mx-auto">
                    মেস ম্যানেজার / ক্যাশিয়ার
                  </div>
                  <p className="text-[8pt] text-gray-700 mt-0.5">স্বাক্ষর: ................................................</p>
                </div>
                <div>
                  <div className="border-t border-black pt-1 font-bold text-black w-48 mx-auto">
                    মেস প্রেসিডেন্ট / এডমিন
                  </div>
                  <p className="text-[8pt] text-gray-700 mt-0.5">স্বাক্ষর: ................................................</p>
                </div>
              </div>

              <div className="mt-6 text-center text-[8pt] text-gray-600 border-t border-gray-300 pt-2 font-mono">
                মেস ম্যানেজমেন্ট সিস্টেম — সদস্য মাস্টার রেজিস্টার | জেনারেশন সময়: {new Date().toLocaleString('bn-BD')}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2.5. MODAL: Dues & Low Balance Member Audit Report */}
      {showDuesReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/40 max-w-4xl w-full shadow-2xl space-y-6 animate-scale-in my-8 print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:border-black">
              <div>
                <h3 className="text-xl font-extrabold text-white font-display print:text-black flex items-center gap-2">
                  🚨 মেসের বকেয়া ও লো-ব্যালেন্স মেম্বারদের ফাইনান্সিয়াল মেমো
                </h3>
                <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
                  যে সকল সদস্যের ওয়ালেট ব্যালেন্স ৳১০০ এর নিচে অথবা নেগেটিভ রয়েছে তাদের তালিকা
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-bold transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট মেমো</span>
                </button>
                <button onClick={() => setShowDuesReportModal(false)} className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {(() => {
              const duesList = users.filter((u) => u.walletBalance < 100);
              const negativeCount = duesList.filter((u) => u.walletBalance < 0).length;
              const totalNegativeSum = duesList.filter((u) => u.walletBalance < 0).reduce((sum, u) => sum + Math.abs(u.walletBalance), 0);

              return (
                <>
                  {/* Dues KPI Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 print:border-black print:bg-gray-100">
                      <span className="text-rose-300 print:text-black block font-bold">বকেয়া/লো-ব্যালেন্স মেম্বার</span>
                      <span className="text-lg font-extrabold text-rose-400 print:text-black font-mono">{duesList.length} জন</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 print:border-black print:bg-gray-100">
                      <span className="text-rose-300 print:text-black block font-bold">নেগেটিভ ব্যালেন্স মেম্বার</span>
                      <span className="text-lg font-extrabold text-rose-400 print:text-black font-mono">{negativeCount} জন</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 print:border-black print:bg-gray-100">
                      <span className="text-amber-300 print:text-black block font-bold">মোট নেগেটিভ বকেয়া (৳)</span>
                      <span className="text-lg font-extrabold text-amber-400 print:text-black font-mono">৳{totalNegativeSum}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 print:border-black print:bg-gray-100">
                      <span className="text-slate-400 print:text-black block font-bold">রিপোর্ট সময়কাল</span>
                      <span className="text-xs font-bold text-cyan-400 print:text-black font-mono mt-1 block">
                        {new Date().toLocaleDateString('bn-BD')}
                      </span>
                    </div>
                  </div>

                  {/* Printable Dues Warning Banner */}
                  <div className="hidden print:block p-3 border-2 border-black bg-gray-100 text-black text-xs font-bold font-sans">
                    📢 মেস ক্যাশিয়ার ও ম্যানেজার নোটিশ: নিম্নোক্ত মেম্বারদের ওয়ালেট ব্যালেন্স দ্রুত পজিটিভ করার জন্য মেস রুলস অনুযায়ী তাগাদা প্রদান করা হচ্ছে।
                  </div>

                  {/* Dues Member Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-black">
                    <table className="w-full text-left text-xs border border-black border-collapse">
                      <thead className="bg-slate-900/90 text-slate-300 uppercase text-[10px] font-mono border-b border-slate-800 print:bg-gray-100 print:text-black print:border-black">
                        <tr>
                          <th className="p-3 font-bold border border-black">ক্রঃ</th>
                          <th className="p-3 font-bold border border-black">মেম্বারের নাম ও ফোন</th>
                          <th className="p-3 font-bold border border-black">রুম ও সিট</th>
                          <th className="p-3 font-bold border border-black">ধরণ</th>
                          <th className="p-3 font-bold text-right border border-black">বর্তমান ব্যালেন্স</th>
                          <th className="p-3 font-bold text-center border border-black">বকেয়া স্ট্যাটাস</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                        {duesList.length > 0 ? (
                          duesList.map((u, index) => (
                            <tr key={u.id} className="hover:bg-slate-900/50 print:hover:bg-transparent">
                              <td className="p-3 font-mono text-slate-400 print:text-black border border-black">{index + 1}</td>
                              <td className="p-3 font-bold text-white print:text-black border border-black">
                                {u.name}
                                <span className="block text-[10px] text-slate-400 print:text-black font-normal font-mono">{u.phone}</span>
                              </td>
                              <td className="p-3 text-slate-300 print:text-black font-mono border border-black font-bold">
                                {u.profile?.roomNumber ? `রুম ${u.profile.roomNumber}` : 'N/A'} {u.profile?.seatNumber ? `(${u.profile.seatNumber})` : ''}
                              </td>
                              <td className="p-3 text-slate-300 print:text-black border border-black">
                                {u.userType === 'PERMANENT' ? 'স্থায়ী' : 'অতিথি'}
                              </td>
                              <td className={`p-3 text-right font-mono font-bold border border-black ${u.walletBalance < 0 ? 'text-rose-400 print:text-black' : 'text-amber-400 print:text-black'}`}>
                                ৳{u.walletBalance}
                              </td>
                              <td className="p-3 text-center border border-black">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border print:bg-white print:text-black print:border-black ${
                                  u.walletBalance < 0
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}>
                                  {u.walletBalance < 0 ? '🚨 নেগেটিভ ব্যালেন্স' : '⚠️ লো ব্যালেন্স (<৳১০০)'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500 print:text-black italic">
                              কোনো মেম্বারের বকেয়া বা লো-ব্যালেন্স নেই! সকল মেম্বারের ওয়ালেট ব্যালেন্স নিরাপদ পর্যায়ে রয়েছে।
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Printable Formal Signatures */}
                  <div className="hidden print:block pt-10 mt-6 print-avoid-break border-t border-black">
                    <div className="grid grid-cols-2 gap-8 text-center text-xs">
                      <div>
                        <div className="border-t border-black pt-1 font-bold text-black w-48 mx-auto">
                          মেস ক্যাশিয়ার / অডিটর
                        </div>
                        <p className="text-[8pt] text-gray-700 mt-0.5">স্বাক্ষর: ................................................</p>
                      </div>
                      <div>
                        <div className="border-t border-black pt-1 font-bold text-black w-48 mx-auto">
                          মেস সভাপতি / এডমিন
                        </div>
                        <p className="text-[8pt] text-gray-700 mt-0.5">স্বাক্ষর: ................................................</p>
                      </div>
                    </div>

                    <div className="mt-6 text-center text-[8pt] text-gray-600 border-t border-gray-300 pt-2 font-mono">
                      মেস ম্যানেজমেন্ট সিস্টেম — বকেয়া ও লো-ব্যালেন্স মেম্বার অডিট মেমো | জেনারেশন সময়: {new Date().toLocaleString('bn-BD')}
                    </div>
                  </div>
                </>
              );
            })()}
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
