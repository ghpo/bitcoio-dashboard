import { NextRequest, NextResponse } from 'next/server';
import { isUnlocked, getUnlockedAddress } from '@/lib/wallet-server';

// USDCx token contract
const USDCX_CONTRACT = 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx';
const USDCX_TOKEN_NAME = 'usdcx-token';
const READONLY_API = process.env.BITFLOW_READONLY_API_HOST || 'https://node.bitflowapis.finance';

async function fetchBalance(address: string): Promise<number | null> {
  try {
    const url = `${READONLY_API}/extended/v1/address/${address}/balances`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const data = await r.json();
    
    // Hiro API returns fungible_tokens as an object keyed by contract.asset
    const ft = data?.fungible_tokens;
    if (!ft) return null;
    
    // Try exact match: contract::token-name
    const key = `${USDCX_CONTRACT}::${USDCX_TOKEN_NAME}`;
    if (ft[key]) {
      const bal = parseFloat(ft[key].balance);
      const decimals = ft[key].decimals || 6;
      return bal / Math.pow(10, decimals);
    }
    
    // Search by contract substring
    for (const [k, v] of Object.entries<{ balance: string; decimals: number }>(ft)) {
      if (k.includes('usdcx') || k.includes('USDCx')) {
        const bal = parseFloat(v.balance);
        const dec = v.decimals || 6;
        return bal / Math.pow(10, dec);
      }
    }
    
    return 0;
  } catch {
    return null;
  }
}

export async function GET() {
  if (!isUnlocked()) {
    return NextResponse.json({ unlocked: false });
  }

  const address = getUnlockedAddress()!;
  const balance = await fetchBalance(address);

  return NextResponse.json({
    unlocked: true,
    address,
    usdcxBalance: balance,
  });
}
