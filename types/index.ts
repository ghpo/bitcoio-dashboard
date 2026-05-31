export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  token: string;
  amount: number;
  price?: number;
  stxPaid?: number;
  buyPrice?: number;
  sellPrice?: number;
  cost?: number;
  revenue?: number;
  profit?: number;
  profitPct?: number;
  date: string;
  status: string;
}

export interface Summary {
  totalBought: number;
  totalSold: number;
  totalProfit: number;
  wins: number;
  losses: number;
  totalTrades: number;
}

// ── Dashboard Types ──

export interface TokenPrice {
  token: string;
  tokenId: string;
  usdcxPrice: number;
  tokenPerUsdcx: number;
  lastUpdated: number;
}

export interface Position {
  id: string;
  token: string;
  amount: number;
  entry_price: number;
  entry_usdcx: number;
  entry_txid: string | null;
  entry_date: string;
  status: 'open' | 'closed' | 'partial';
  sold_amount: number;
  sold_usdcx: number;
  // Client-side cache
  _quotePrice?: number;
  _quoteUsdcx?: number;
  _quoteLoading?: boolean;
}

export interface DashboardSummary {
  totalInvested: number;
  totalSold: number;
  totalProfit: number;
  openPositions: number;
}

export interface DashboardState {
  unlocked: boolean;
  address: string;
  btcAddress: string;
  taprootAddress: string;
  balance: number;
  selectedToken: string;
  prices: Record<string, number>;
  positions: Position[];
  summary: DashboardSummary;
  trading: boolean;
  initialLoading: boolean;
  lastPricesUpdate: number | null;
  pricesChanged: boolean;
}

export type DashboardAction =
  | { type: 'SET_UNLOCKED'; address: string; btcAddress?: string; taprootAddress?: string }
  | { type: 'SET_LOCKED' }
  | { type: 'SET_BALANCE'; balance: number }
  | { type: 'SET_SELECTED_TOKEN'; token: string }
  | { type: 'SET_PRICES'; prices: Record<string, number>; changed: boolean }
  | { type: 'SET_POSITIONS'; positions: Position[]; summary: DashboardSummary }
  | { type: 'UPDATE_POSITION_QUOTE'; positionId: string; quotePrice: number; quoteUsdcx: number }
  | { type: 'SET_TRADING'; trading: boolean }
  | { type: 'SET_INITIAL_LOADING'; loading: boolean }
  | { type: 'PRESERVE_QUOTES'; positions: Position[] };

export interface PendingBuy {
  token: string;
  amount: string;
  price: number;
  receive: number;
}

export const TOKEN_DECIMALS: Record<string, number> = {
  DOG: 5,
  sBTC: 8,
  STX: 6,
};

export const TOKEN_LIST = ['DOG', 'sBTC', 'STX'] as const;
export type TokenSymbol = (typeof TOKEN_LIST)[number];
