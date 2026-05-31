import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Transaction, Summary } from '@/types';

const DB = path.join(process.cwd(), 'data', 'transactions.json');

function load(): Transaction[] {
  if (!fs.existsSync(DB)) return [];
  return JSON.parse(fs.readFileSync(DB, 'utf8')).transactions || [];
}

function save(txs: Transaction[]) {
  const dir = path.dirname(DB);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB, JSON.stringify({ transactions: txs, lastUpdate: new Date().toISOString() }, null, 2));
}

function computeSummary(txs: Transaction[]): Summary {
  let tb = 0, ts = 0, tp = 0, w = 0, l = 0;
  for (const t of txs) {
    if (t.type === 'BUY') tb += t.stxPaid || 0;
    if (t.type === 'SELL') { ts += t.revenue || 0; tp += t.profit || 0; t.profit! >= 0 ? w++ : l++; }
  }
  return { totalBought: tb, totalSold: ts, totalProfit: tp, wins: w, losses: l, totalTrades: txs.length };
}

export async function GET(req: NextRequest) {
  const txs = load();
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
  const recent = txs.slice(-limit).reverse();
  return NextResponse.json({ transactions: recent, summary: computeSummary(txs) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const txs = load();
  const { action, token, amount, price, stxPaid, buyPrice, sellPrice } = body;

  if (action === 'buy') {
    const tx: Transaction = {
      id: 'tx_' + Date.now(),
      type: 'BUY',
      token,
      amount: parseFloat(amount),
      price: parseFloat(price) || 0,
      stxPaid: parseFloat(stxPaid) || 0,
      date: new Date().toISOString(),
      status: 'confirmed'
    };
    txs.push(tx);
    save(txs);
    return NextResponse.json({ success: true, transaction: tx, summary: computeSummary(txs) });
  }

  if (action === 'sell') {
    const bp = parseFloat(buyPrice), sp = parseFloat(sellPrice), a = parseFloat(amount);
    const tx: Transaction = {
      id: 'tx_' + Date.now(),
      type: 'SELL',
      token,
      amount: a,
      buyPrice: bp,
      sellPrice: sp,
      cost: bp * a,
      revenue: sp * a,
      profit: (sp - bp) * a,
      profitPct: bp > 0 ? parseFloat((((sp - bp) / bp) * 100).toFixed(2)) : 0,
      date: new Date().toISOString(),
      status: 'confirmed'
    };
    txs.push(tx);
    save(txs);
    return NextResponse.json({ success: true, transaction: tx, summary: computeSummary(txs) });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
