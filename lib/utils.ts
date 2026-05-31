import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Formatting ──

export function fmtUsdcx(n: number | string): string {
  const v = Number(n ?? 0);
  if (v < 0.01) return v.toFixed(6);
  if (v < 1) return v.toFixed(5);
  return v.toFixed(2);
}

export function fmtToken(n: number | string, decimals: number = 5): string {
  return Number(n ?? 0).toFixed(decimals);
}

export function fmtPrice(n: number | string): string {
  const v = Number(n ?? 0);
  if (v < 0.001) return v.toFixed(8);
  if (v < 0.01) return v.toFixed(6);
  if (v < 1) return v.toFixed(5);
  if (v >= 1000) return v.toFixed(2);
  return v.toFixed(4);
}

export function fmtShortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export function fmtTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('pt-BR');
}

// ── P&L helpers ──

export function calcPnl(position: {
  entry_price: number;
  amount: number;
  sold_amount?: number;
  _quotePrice?: number;
}, marketPrice?: number): { pnl: number; pnlPct: number } {
  const rem = position.amount - (position.sold_amount ?? 0);
  const price = position._quotePrice ?? marketPrice ?? position.entry_price;
  const pnl = (price - position.entry_price) * rem;
  const pnlPct = position.entry_price > 0 ? ((price - position.entry_price) / position.entry_price) * 100 : 0;
  return { pnl, pnlPct };
}

export function pnlColor(pnl: number): string {
  return pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : 'text-white/50';
}
