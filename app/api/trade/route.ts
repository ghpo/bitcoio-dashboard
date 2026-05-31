import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { homedir } from 'os';
import { isUnlocked, getUnlockedAddress, getStxPrivateKey } from '@/lib/wallet-server';
import {
  createPosition, createTrade, getSummary,
  getPosition, updatePosition, getAllPositions,
} from '@/lib/db';
import { TRACKED_TOKENS } from '@/lib/bitflow-price';

const execAsync = promisify(exec);

const WORKSPACE = resolve(homedir(), '.openclaw', 'workspace');
const AGENTS_DIR = resolve(WORKSPACE, '.agents');
const AGGREGATOR_CLI = resolve(AGENTS_DIR, 'bitflow-swap-aggregator', 'bitflow-swap-aggregator.ts');

function getBunCommand(): string {
  return resolve(homedir(), '.bun', 'bin', 'bun');
}

const ENV = {
  BITFLOW_API_HOST: 'https://bitflow-sdk-api-gateway-7owjsmt8.uc.gateway.dev',
  BITFLOW_READONLY_API_HOST: 'https://node.bitflowapis.finance',
};

async function getQuote(tokenIn: string, tokenOut: string, amountIn: string): Promise<number | null> {
  try {
    const walletAddr = getUnlockedAddress();
    const pk = getStxPrivateKey();
    const cmd = `cd "${AGENTS_DIR}" && BITFLOW_API_HOST="${ENV.BITFLOW_API_HOST}" BITFLOW_READONLY_API_HOST="${ENV.BITFLOW_READONLY_API_HOST}" STACKS_PRIVATE_KEY="${pk}" "${getBunCommand()}" run "${AGGREGATOR_CLI}" quote --wallet ${walletAddr} --token-in ${tokenIn} --token-out ${tokenOut} --amount-in ${amountIn}`;

    const { stdout } = await execAsync(cmd, { encoding: 'utf8', timeout: 20_000 });
    const parsed = JSON.parse(stdout.trim());
    return parsed.data?.quote?.quote ?? null;
  } catch {
    return null;
  }
}

async function execSwap(tokenIn: string, tokenOut: string, amountIn: string): Promise<{ success: boolean; txid?: string; amountOut?: number; error?: string }> {
  try {
    const walletAddr = getUnlockedAddress();
    const pk = getStxPrivateKey();
    const cmd = `cd "${AGENTS_DIR}" && BITFLOW_API_HOST="${ENV.BITFLOW_API_HOST}" BITFLOW_READONLY_API_HOST="${ENV.BITFLOW_READONLY_API_HOST}" STACKS_PRIVATE_KEY="${pk}" "${getBunCommand()}" run "${AGGREGATOR_CLI}" run --wallet ${walletAddr} --token-in ${tokenIn} --token-out ${tokenOut} --amount-in ${amountIn} --confirm SWAP --wait-seconds 60`;

    const { stdout } = await execAsync(cmd, { encoding: 'utf8', timeout: 120_000 });
    const parsed = JSON.parse(stdout.trim());

    if (parsed.status !== 'success') {
      return { success: false, error: parsed.error || 'Swap failed' };
    }

    return {
      success: true,
      txid: parsed.data?.txid || parsed.data?.transactionId,
      amountOut: parsed.data?.amountOut || parsed.data?.quote?.quote,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function findTokenId(tokenOrSymbol: string): string | null {
  // Direct token ID match
  if (tokenOrSymbol.startsWith('token-')) return tokenOrSymbol;
  // Symbol match
  const info = TRACKED_TOKENS[tokenOrSymbol];
  return info?.id ?? null;
}

function getSymbolFromId(tokenId: string): string {
  return Object.entries(TRACKED_TOKENS).find(([, v]) => v.id === tokenId)?.[0] || tokenId;
}

export async function POST(req: NextRequest) {
  if (!isUnlocked()) {
    return NextResponse.json({ error: 'Wallet locked. Unlock first.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, token, amount } = body;

    if (!action || !token) {
      return NextResponse.json({ error: 'action and token required' }, { status: 400 });
    }

    const tokenId = findTokenId(token);
    if (!tokenId) {
      return NextResponse.json({ error: `Unknown token: ${token}` }, { status: 400 });
    }

    const tokenSymbol = getSymbolFromId(tokenId);
    const tokenInfo = TRACKED_TOKENS[tokenSymbol];
    const decimals = tokenInfo?.decimals || 6;

    // ── BUY ──
    if (action === 'buy') {
      if (!amount || parseFloat(amount) <= 0) {
        return NextResponse.json({ error: 'Valid USDCx amount required' }, { status: 400 });
      }

      const usdcxAmount = parseFloat(amount);
      const amountStr = usdcxAmount.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');

      const expectedOut = await getQuote('token-USDCx-auto', tokenId, amountStr);
      if (!expectedOut) {
        return NextResponse.json({ error: 'Could not get quote. Try again.' }, { status: 500 });
      }

      const result = await execSwap('token-USDCx-auto', tokenId, amountStr);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Swap failed' }, { status: 500 });
      }

      const tokenAmount = result.amountOut ?? expectedOut;
      const entryPrice = usdcxAmount / tokenAmount;

      const pos = createPosition({
        id: 'pos_' + Date.now(),
        token: tokenSymbol,
        amount: tokenAmount,
        entry_price: entryPrice,
        entry_usdcx: usdcxAmount,
        entry_txid: result.txid || null,
        entry_date: new Date().toISOString(),
        status: 'open',
        sold_amount: 0,
        sold_usdcx: 0,
      });

      createTrade({
        id: 'tx_' + Date.now(),
        position_id: pos.id,
        type: 'buy',
        token: tokenSymbol,
        amount: tokenAmount,
        price: entryPrice,
        usdcx: usdcxAmount,
        txid: result.txid || null,
        date: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        position: pos,
        txid: result.txid,
        tokenAmount: tokenAmount.toFixed(Math.min(decimals, 8)),
        entryPrice: entryPrice.toFixed(Math.min(decimals, 8)),
        summary: getSummary(),
      });
    }

    // ── SELL ──
    if (action === 'sell') {
      const { positionId, sellAmount } = body;
      if (!positionId) {
        return NextResponse.json({ error: 'positionId required' }, { status: 400 });
      }

      const pos = getPosition(positionId);
      if (!pos) return NextResponse.json({ error: 'Position not found' }, { status: 404 });
      if (pos.status === 'closed') return NextResponse.json({ error: 'Position already closed' }, { status: 400 });

      const remaining = pos.amount - pos.sold_amount;
      const sellAmt = sellAmount || remaining;
      if (sellAmt <= 0 || sellAmt > remaining) {
        return NextResponse.json({ error: `Invalid sell amount. Remaining: ${remaining}` }, { status: 400 });
      }

      const posTokenInfo = TRACKED_TOKENS[pos.token] || { id: 'token-dog', decimals: 5 };
      const sellAmtStr = sellAmt.toFixed(posTokenInfo.decimals).replace(/0+$/, '').replace(/\.$/, '');

      // Reverse quote: token → USDCx
      const reverseQuote = await getQuote(posTokenInfo.id, 'token-USDCx-auto', sellAmtStr);

      const result = await execSwap(posTokenInfo.id, 'token-USDCx-auto', sellAmtStr);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Swap failed' }, { status: 500 });
      }

      const usdcxReceived = result.amountOut ?? reverseQuote ?? 0;
      const sellPrice = usdcxReceived / sellAmt;
      const profit = (sellPrice - pos.entry_price) * sellAmt;

      const newSoldAmount = pos.sold_amount + sellAmt;
      const newSoldUsdcx = pos.sold_usdcx + usdcxReceived;
      const newStatus = newSoldAmount >= pos.amount ? 'closed' : 'partial';

      updatePosition(pos.id, {
        sold_amount: newSoldAmount,
        sold_usdcx: newSoldUsdcx,
        status: newStatus,
      });

      createTrade({
        id: 'tx_' + Date.now(),
        position_id: pos.id,
        type: 'sell',
        token: pos.token,
        amount: sellAmt,
        price: sellPrice,
        usdcx: usdcxReceived,
        txid: result.txid || null,
        date: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        position: getPosition(pos.id),
        txid: result.txid,
        usdcxReceived: usdcxReceived.toFixed(2),
        profit: profit.toFixed(2),
        summary: getSummary(),
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "buy" or "sell".' }, { status: 400 });
  } catch (err: any) {
    console.error('[trade]', err);
    return NextResponse.json({ error: err.message || 'Trade failed' }, { status: 500 });
  }
}

export async function GET() {
  const positions = getAllPositions();
  return NextResponse.json({ positions, summary: getSummary() });
}
