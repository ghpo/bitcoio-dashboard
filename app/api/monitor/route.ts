import { NextResponse } from 'next/server';
import { sendTelegram } from '@/lib/telegram';
import { getAllPositions } from '@/lib/db';
import { getPrice, TRACKED_TOKENS } from '@/lib/bitflow-price';

// Track last known P&L to avoid duplicate alerts
declare global { var __pnlAlertState: Map<string, number> | undefined; }
declare global { var __lastPrices: Record<string, number> | undefined; }
(globalThis as any).__pnlAlertState ??= new Map<string, number>();
(globalThis as any).__lastPrices ??= {};

const GLOBAL_PNL_KEY = '__global__';
const PROFIT_THRESHOLD = 0.03; // 3%
const VOLATILITY_THRESHOLD = 0.05; // 5%

interface TokenInfo {
  token: string;
  entryPrice: number;
  amount: number;
  remaining: number;
  sellPrice: number;
  pnl: number;
  pnlPct: number;
}

// Analyzes token spread (buy vs sell price)
async function analyzeToken(token: string): Promise<string> {
  const info = TRACKED_TOKENS[token];
  if (!info) return '';
  try {
    // Get live sell quote
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsyncLocal = promisify(exec);
    const { resolve } = await import('path');
    const { homedir } = await import('os');
    const AGENTS_DIR = resolve(homedir(), '.openclaw', 'workspace', '.agents');
    const AGGREGATOR_CLI = resolve(AGENTS_DIR, 'bitflow-swap-aggregator', 'bitflow-swap-aggregator.ts');
    const BUN = resolve(homedir(), '.bun', 'bin', 'bun');
    const ENV_LOCAL = {
      BITFLOW_API_HOST: process.env.BITFLOW_API_HOST || 'https://bitflow-sdk-api-gateway-7owjsmt8.uc.gateway.dev',
      BITFLOW_READONLY_API_HOST: process.env.BITFLOW_READONLY_API_HOST || 'https://node.bitflowapis.finance',
    };

    // Buy direction (same as dashboard)
    const buyCmd = `cd "${AGENTS_DIR}" && BITFLOW_API_HOST="${ENV_LOCAL.BITFLOW_API_HOST}" BITFLOW_READONLY_API_HOST="${ENV_LOCAL.BITFLOW_READONLY_API_HOST}" "${BUN}" run "${AGGREGATOR_CLI}" quote --token-in token-USDCx-auto --token-out token-dog --amount-in 100`;
    const { stdout: buyOut } = await execAsyncLocal(buyCmd, { encoding: 'utf8', timeout: 20_000 });
    const buyParsed = JSON.parse(buyOut.trim());
    const tokenPerUsdcx = buyParsed?.data?.quote?.quote;
    const buyPrice = tokenPerUsdcx ? 100 / tokenPerUsdcx : 0;

    // Sell direction
    const sellCmd = `cd "${AGENTS_DIR}" && BITFLOW_API_HOST="${ENV_LOCAL.BITFLOW_API_HOST}" BITFLOW_READONLY_API_HOST="${ENV_LOCAL.BITFLOW_READONLY_API_HOST}" "${BUN}" run "${AGGREGATOR_CLI}" quote --token-in token-dog --token-out token-USDCx-auto --amount-in 100`;
    const { stdout: sellOut } = await execAsyncLocal(sellCmd, { encoding: 'utf8', timeout: 20_000 });
    const sellParsed = JSON.parse(sellOut.trim());
    const sellPrice = sellParsed?.data?.quote?.quote ? sellParsed.data.quote.quote / 100 : 0;

    if (!sellPrice || !buyPrice) return '';
    const spread = ((buyPrice - sellPrice) / buyPrice) * 100;
    const emoji = spread > 5 ? '🔴' : spread > 2 ? '🟡' : '🟢';
    return `\n📊 <b>${token}</b>: Buy $${buyPrice.toFixed(6)} | Sell $${sellPrice.toFixed(6)} | Spread ${spread.toFixed(1)}% ${emoji}`;
  } catch { return ''; }
}

export async function GET() {
  try {
    const positions = getAllPositions();
    const open = positions.filter((p: any) => p.status !== 'closed');
    const alertState: Map<string, number> = (globalThis as any).__pnlAlertState;

    if (open.length === 0) {
      // Reset alert state if no positions
      alertState.clear();
      return NextResponse.json({ ok: true, message: 'No open positions' });
    }

    const details: TokenInfo[] = [];
    let totalPnl = 0;
    let totalInvested = 0;

    for (const pos of open) {
      const remaining = pos.amount - (pos.sold_amount || 0);
      if (remaining <= 0) continue;

      const priceData = await getPrice(pos.token);
      const price = priceData?.usdcxPrice ?? pos.entry_price;

      // Check volatility (price change vs last known)
      const lastPrices: Record<string, number> = (globalThis as any).__lastPrices;
      if (lastPrices[pos.token] && lastPrices[pos.token] > 0) {
        const change = Math.abs((price - lastPrices[pos.token]) / lastPrices[pos.token]);
        if (change >= VOLATILITY_THRESHOLD) {
          const dir = price > lastPrices[pos.token] ? '📈 subiu' : '📉 caiu';
          await sendTelegram(`🤖 <b>bitcoio alert</b>\n⚠️ <b>Alta volatilidade: ${pos.token}</b>\n• ${dir} ${(change * 100).toFixed(1)}% em 5min\n• De $${lastPrices[pos.token].toFixed(6)} → $${price.toFixed(6)}`);
        }
      }
      lastPrices[pos.token] = price;

      const pnl = (price - pos.entry_price) * remaining;
      const pnlPct = pos.entry_price > 0 ? ((price - pos.entry_price) / pos.entry_price) * 100 : 0;
      const entryValue = remaining * pos.entry_price;
      totalPnl += pnl;
      totalInvested += entryValue;

      details.push({ token: pos.token, entryPrice: pos.entry_price, amount: pos.amount, remaining, sellPrice: price, pnl, pnlPct });

      // Check per-token alert
      const key = `token_${pos.id}`;
      const prev = alertState.get(key) ?? 0;
      if (pnlPct >= PROFIT_THRESHOLD * 100 && prev < PROFIT_THRESHOLD * 100) {
        const emoji = pnlPct >= 10 ? '🚀' : pnlPct >= 5 ? '📈' : '💰';
        const msg = `${emoji} <b>${pos.token}</b> atingiu <b>+${pnlPct.toFixed(1)}%</b> de lucro!\n` +
          `• Posição: ${remaining.toFixed(2)} ${pos.token}\n` +
          `• Entry: $${pos.entry_price.toFixed(6)}\n` +
          `• Atual: $${price.toFixed(6)}\n` +
          `• P&L: $${pnl.toFixed(4)}`;
        await sendTelegram(formatAlert(msg));
      }
      alertState.set(key, pnlPct);
    }

    // Check global P&L alert
    const globalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const globalPrev = alertState.get(GLOBAL_PNL_KEY) ?? 0;
    if (globalPnlPct >= PROFIT_THRESHOLD * 100 && globalPrev < PROFIT_THRESHOLD * 100) {
      const emoji = globalPnlPct >= 10 ? '🚀' : '📈';
      let msg = `${emoji} <b>Portfolio total: +${globalPnlPct.toFixed(1)}%</b> de lucro!\n`;
      msg += `• P&L total: $${totalPnl.toFixed(4)}\n`;
      msg += `• Investido: $${totalInvested.toFixed(2)}\n`;
      for (const d of details) {
        msg += `• ${d.token}: ${d.pnl >= 0 ? '+' : ''}$${d.pnl.toFixed(4)} (${d.pnl >= 0 ? '+' : ''}${d.pnlPct.toFixed(1)}%)\n`;
      }
      await sendTelegram(formatAlert(msg));
    }
    alertState.set(GLOBAL_PNL_KEY, globalPnlPct);

    return NextResponse.json({
      ok: true,
      globalPnlPct,
      totalPnl,
      totalInvested,
      positions: open.length,
      details,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/monitor/summary — full position summary with analysis
export async function POST() {
  try {
    const positions = getAllPositions();
    const open = positions.filter((p: any) => p.status !== 'closed');

    if (open.length === 0) {
      await sendTelegram('🤖 <b>bitcoio</b>\n📭 Nenhuma posição aberta no momento.');
      return NextResponse.json({ ok: true, message: 'No positions' });
    }

    let msg = '🤖 <b>bitcoio · Posições Abertas</b>\n';
    let totalPnl = 0;
    let totalInvested = 0;

    for (const pos of open) {
      const remaining = pos.amount - (pos.sold_amount || 0);
      if (remaining <= 0) continue;
      const priceData = await getPrice(pos.token);
      const price = priceData?.usdcxPrice ?? pos.entry_price;
      const pnl = (price - pos.entry_price) * remaining;
      const pnlPct = pos.entry_price > 0 ? ((price - pos.entry_price) / pos.entry_price) * 100 : 0;
      const entryValue = remaining * pos.entry_price;
      totalPnl += pnl;
      totalInvested += entryValue;

      const emoji = pnl >= 0 ? '🟢' : '🔴';
      msg += `\n${emoji} <b>${pos.token}</b>: ${remaining.toFixed(2)} tokens`;
      msg += `\n   Entry $${pos.entry_price.toFixed(6)} → Atual $${price.toFixed(6)}`;
      msg += `\n   P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(4)} (${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)`;

      // Add market analysis
      const analysis = await analyzeToken(pos.token);
      if (analysis) msg += analysis;
    }

    const globalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    msg += `\n\n📈 <b>Total:</b> ${globalPnlPct >= 0 ? '+' : ''}$${totalPnl.toFixed(4)} (${globalPnlPct >= 0 ? '+' : ''}${globalPnlPct.toFixed(1)}%)`;

    await sendTelegram(msg);
    return NextResponse.json({ ok: true, positions: open.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function formatAlert(text: string): string {
  return `🤖 <b>bitcoio alert</b>\n${text}`;
}
