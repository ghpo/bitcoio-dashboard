import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { homedir } from 'os';

const execAsync = promisify(exec);
const AGENTS_DIR = resolve(homedir(), '.openclaw', 'workspace', '.agents');
const AGGREGATOR_CLI = resolve(AGENTS_DIR, 'bitflow-swap-aggregator', 'bitflow-swap-aggregator.ts');
const BUN = resolve(homedir(), '.bun', 'bin', 'bun');
const ENV = {
  BITFLOW_API_HOST: 'https://bitflow-sdk-api-gateway-7owjsmt8.uc.gateway.dev',
  BITFLOW_READONLY_API_HOST: 'https://node.bitflowapis.finance',
};

const TOKEN_IDS: Record<string, string> = { DOG: 'token-dog', sBTC: 'token-sbtc', STX: 'token-stx' };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const amount = searchParams.get('amount');
  const direction = searchParams.get('direction') || 'sell';

  if (!token || !amount) {
    return NextResponse.json({ error: 'token and amount required' }, { status: 400 });
  }

  const tokenId = TOKEN_IDS[token];
  if (!tokenId) return NextResponse.json({ error: `Unknown token: ${token}` }, { status: 400 });

  try {
    if (direction === 'sell') {
      const cmd = `cd "${AGENTS_DIR}" && BITFLOW_API_HOST="${ENV.BITFLOW_API_HOST}" BITFLOW_READONLY_API_HOST="${ENV.BITFLOW_READONLY_API_HOST}" "${BUN}" run "${AGGREGATOR_CLI}" quote --token-in ${tokenId} --token-out token-USDCx-auto --amount-in ${amount}`;
      const { stdout } = await execAsync(cmd, { encoding: 'utf8', timeout: 20_000 });
      const parsed = JSON.parse(stdout.trim());
      if (parsed.status === 'success') {
        const usdcxOut = parsed.data?.quote?.quote || 0;
        const price = amount ? usdcxOut / parseFloat(amount) : 0;
        return NextResponse.json({ usdcxOut, price, amount: parseFloat(amount), token });
      }
      return NextResponse.json({ error: 'Quote failed' }, { status: 500 });
    } else {
      const cmd = `cd "${AGENTS_DIR}" && BITFLOW_API_HOST="${ENV.BITFLOW_API_HOST}" BITFLOW_READONLY_API_HOST="${ENV.BITFLOW_READONLY_API_HOST}" "${BUN}" run "${AGGREGATOR_CLI}" quote --token-in token-USDCx-auto --token-out ${tokenId} --amount-in ${amount}`;
      const { stdout } = await execAsync(cmd, { encoding: 'utf8', timeout: 20_000 });
      const parsed = JSON.parse(stdout.trim());
      if (parsed.status === 'success') {
        const tokenOut = parsed.data?.quote?.quote || 0;
        return NextResponse.json({ tokenOut, price: tokenOut ? parseFloat(amount) / tokenOut : 0, amount: parseFloat(amount), token });
      }
      return NextResponse.json({ error: 'Quote failed' }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
