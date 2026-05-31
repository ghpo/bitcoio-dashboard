'use client';
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '@/providers/dashboard-provider';
import { Button } from '@/components/ui/button';
import { fmtToken, fmtPrice, fmtUsdcx, fmtDate } from '@/lib/utils';
import { TOKEN_DECIMALS } from '@/types';

const TOKENS = ['All', 'DOG', 'sBTC', 'STX'] as const;
const STATUSES = ['All', 'open', 'partial', 'closed'] as const;
const PAGE_SIZES = [10, 25, 50] as const;

export function HistoryPanel() {
  const { state } = useDashboard();
  const [tokenFilter, setTokenFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Filter positions
  const filtered = useMemo(() => {
    return state.positions.filter(p => {
      if (tokenFilter !== 'All' && p.token !== tokenFilter) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      return true;
    });
  }, [state.positions, tokenFilter, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Calculate totals
  const totals = useMemo(() => {
    let totalInvested = 0, totalSold = 0, totalPnl = 0;
    for (const p of filtered) {
      const invested = p.entry_usdcx || (p.amount * p.entry_price);
      totalInvested += invested;
      totalSold += p.sold_usdcx || 0;
      if (p.sold_amount > 0) {
        const sellPrice = p.sold_usdcx / p.sold_amount;
        totalPnl += (sellPrice - p.entry_price) * p.sold_amount;
      }
    }
    return { totalInvested, totalSold, totalPnl };
  }, [filtered]);

  if (state.positions.length === 0) {
    return <div className="text-center py-20"><div className="text-3xl mb-3">📜</div><p className="text-sm text-white/15">No trades yet</p></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] text-center">
          <div className="text-[9px] text-white/20 uppercase tracking-wider mb-0.5">Invested</div>
          <div className="text-xs font-semibold text-white/60">${fmtUsdcx(totals.totalInvested)}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] text-center">
          <div className="text-[9px] text-white/20 uppercase tracking-wider mb-0.5">Sold</div>
          <div className="text-xs font-semibold text-white/60">${fmtUsdcx(totals.totalSold)}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] text-center">
          <div className="text-[9px] text-white/20 uppercase tracking-wider mb-0.5">P&amp;L</div>
          <div className={`text-xs font-semibold ${totals.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totals.totalPnl >= 0 ? '+' : ''}${fmtUsdcx(Math.abs(totals.totalPnl))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={tokenFilter} onChange={e => { setTokenFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/40 outline-none">
          {TOKENS.map(t => <option key={t} value={t}>{t === 'All' ? 'All Tokens' : t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/40 outline-none">
          {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-[10px] text-white/12 self-center">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.05] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="border-b border-white/[0.04] text-[9px] text-white/20 uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Token</th>
              <th className="text-right px-4 py-3 font-medium">Amount</th>
              <th className="text-right px-4 py-3 font-medium">Entry</th>
              <th className="text-right px-4 py-3 font-medium">Sell</th>
              <th className="text-right px-4 py-3 font-medium">Value</th>
              <th className="text-right px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Date</th>
            </tr></thead>
            <tbody>
              {paged.map((pos, i) => {
                const sellPrice = pos.sold_amount > 0 ? (pos.sold_usdcx / pos.sold_amount) : 0;
                const sellColor = sellPrice > 0 ? (sellPrice >= pos.entry_price ? 'text-green-400' : 'text-red-400') : 'text-white/25';
                return (
                  <tr key={pos.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                    <td className="px-4 py-3 font-medium text-white/70">{pos.token}</td>
                    <td className="px-4 py-3 text-right text-white/50">{fmtToken(pos.amount, TOKEN_DECIMALS[pos.token] ?? 5)}</td>
                    <td className="px-4 py-3 text-right text-white/40">${fmtPrice(pos.entry_price)}</td>
                    <td className={`px-4 py-3 text-right ${sellColor}`}>{sellPrice > 0 ? `$${fmtPrice(sellPrice)}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-white/50">${fmtUsdcx(pos.entry_usdcx || pos.amount * pos.entry_price)}</td>
                    <td className="px-4 py-3 text-right"><span className={`px-2 py-0.5 rounded-full text-[10px] ${pos.status === 'closed' ? 'bg-green-500/8 text-green-400/60' : pos.status === 'partial' ? 'bg-amber-500/8 text-amber-400/60' : 'bg-white/[0.04] text-white/30'}`}>{pos.status}</span></td>
                    <td className="px-4 py-3 text-right text-white/20">{fmtDate(pos.entry_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="ghost" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            ← Prev
          </Button>
          <span className="text-[11px] text-white/20">
            {safePage} / {totalPages}
          </span>
          <Button size="sm" variant="ghost" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            Next →
          </Button>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="ml-3 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/30 outline-none">
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}/page</option>)}
          </select>
        </div>
      )}
    </motion.div>
  );
}
