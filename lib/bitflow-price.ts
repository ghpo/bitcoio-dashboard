/**
 * Bitflow price client — fetches live prices from Bitflow swap aggregator CLI.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { homedir } from 'os';

const execAsync = promisify(exec);

const WORKSPACE = resolve(homedir(), '.openclaw', 'workspace');
const AGENTS_DIR = resolve(WORKSPACE, '.agents');
const AGGREGATOR_CLI = resolve(AGENTS_DIR, 'bitflow-swap-aggregator', 'bitflow-swap-aggregator.ts');

// Tokens we track - key: display name, value: token ID
// Note: USDCx is the base currency (price always 1), not fetched from CLI
export const TRACKED_TOKENS: Record<string, { id: string; decimals: number }> = {
  'DOG': { id: 'token-dog', decimals: 5 },
  'sBTC': { id: 'token-sbtc', decimals: 8 },
  'STX': { id: 'token-stx', decimals: 6 },
};

export interface TokenPrice {
  token: string;
  tokenId: string;
  usdcxPrice: number;        // How many USDCx for 1 token
  tokenPerUsdcx: number;     // How many tokens for 1 USDCx
  lastUpdated: number;
}

interface AggregatorQuote {
  status: string;
  data: {
    quote: { quote: number };
    tokens: {
      input: { tokenDecimals: number };
      output: { tokenDecimals: number };
    };
  };
}

// Cache prices — use globalThis to survive Turbopack HMR
const g = globalThis as any;
if (!g.__priceCache) {
  g.__priceCache = new Map<string, TokenPrice>();
  g.__priceFetching = new Set<string>();
}
const priceCache: Map<string, TokenPrice> = g.__priceCache;
const priceFetching: Set<string> = g.__priceFetching;
const CACHE_TTL = 30_000; // 30s

function getBunCommand(): string {
  return resolve(homedir(), '.bun', 'bin', 'bun');
}

export async function getPrice(tokenSymbol: string): Promise<TokenPrice | null> {
  const now = Date.now();
  const cached = priceCache.get(tokenSymbol);
  if (cached && (now - cached.lastUpdated) < CACHE_TTL) {
    return cached;
  }

  const tokenInfo = TRACKED_TOKENS[tokenSymbol];
  if (!tokenInfo) return null;

  // Dedup: if already fetching this token, wait 500ms and try cache again
  if (priceFetching.has(tokenSymbol)) {
    await new Promise(r => setTimeout(r, 500));
    const retry = priceCache.get(tokenSymbol);
    if (retry) return retry;
  }
  priceFetching.add(tokenSymbol);

  try {
    const { stdout } = await execAsync(
      `cd "${AGENTS_DIR}" && BITFLOW_API_HOST="https://bitflow-sdk-api-gateway-7owjsmt8.uc.gateway.dev" BITFLOW_READONLY_API_HOST="https://node.bitflowapis.finance" "${getBunCommand()}" run "${AGGREGATOR_CLI}" quote --token-in token-USDCx-auto --token-out ${tokenInfo.id} --amount-in 1`,
      { encoding: 'utf8', timeout: 15_000 }
    );

    const parsed: AggregatorQuote = JSON.parse(stdout.trim());
    if (parsed.status !== 'success' || !parsed.data?.quote?.quote) return null;

    const tokenPerUsdcx = parsed.data.quote.quote;
    const usdcxPrice = 1 / tokenPerUsdcx;

    const price: TokenPrice = {
      token: tokenSymbol,
      tokenId: tokenInfo.id,
      usdcxPrice,
      tokenPerUsdcx,
      lastUpdated: now,
    };

    priceCache.set(tokenSymbol, price);
    return price;
  } catch (err) {
    console.error(`[price] Failed to fetch ${tokenSymbol}:`, (err as Error).message);
    return cached || null;
  } finally {
    priceFetching.delete(tokenSymbol);
  }
}

export async function getAllPrices(): Promise<TokenPrice[]> {
  const results = await Promise.all(
    Object.keys(TRACKED_TOKENS).map(t => getPrice(t).catch(() => null))
  );
  return results.filter((p): p is TokenPrice => p !== null);
}

export async function getUsdcxPrice(tokenSymbol: string): Promise<number> {
  const price = await getPrice(tokenSymbol);
  return price?.usdcxPrice ?? 0;
}
