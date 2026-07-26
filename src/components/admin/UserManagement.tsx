import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Search, UserCheck, Eye, Wallet } from 'lucide-react';
import { User, UserType } from '../../types';
import { BN } from '../../constants/banglaText';
import { StatusBadge } from '../common/StatusBadge';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { MockService } from '../../services/mockStorage';

interface UserManagementProps {
  users: User[];
  onSelectUser: (user: User) => void;
  onRefreshData: () => void;
}

const columnHelper = createColumnHelper<User>();

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onSelectUser,
  onRefreshData,
}) => {
  const [globalFilter, setGlobalFilter] = useState('');

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
      columnHelper.accessor('roomNo', {
        header: 'রুম',
        cell: (info) => <span className="font-mono text-slate-300">{info.getValue() || '-'}</span>,
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
          <span className="font-bold font-mono text-emerald-400">
            <AnimatedNumber value={info.getValue()} prefix={BN.tkSymbol} decimals={0} />
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'একশন',
        cell: (info) => (
          <button
            onClick={() => onSelectUser(info.row.original)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            {BN.viewDetails}
          </button>
        ),
      }),
    ],
    [onSelectUser]
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

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto animate-scale-in">
      
      {/* Header & Search */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <UserCheck className="w-5 h-5 text-cyan-400" />
            </div>
            {BN.users} ও সদস্য অ্যাকাউন্ট তালিকা
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            মোট রেজিস্টার্ড সদস্য: <span className="font-mono font-bold text-cyan-300">{users.length}</span> জন
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={BN.searchUser}
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-2xl py-3 pl-11 pr-4 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
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

    </div>
  );
};
