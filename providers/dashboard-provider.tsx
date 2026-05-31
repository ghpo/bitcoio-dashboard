'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { DashboardState, DashboardAction } from '@/types';

const initialState: DashboardState = {
  unlocked: false, address: '', btcAddress: '', taprootAddress: '', balance: 0, selectedToken: 'DOG', prices: {}, positions: [],
  summary: { totalInvested: 0, totalSold: 0, totalProfit: 0, openPositions: 0 },
  trading: false, initialLoading: false, lastPricesUpdate: null, pricesChanged: false,
};

function reducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_UNLOCKED': return { ...state, unlocked: true, address: action.address, btcAddress: action.btcAddress || '', taprootAddress: action.taprootAddress || '' };
    case 'SET_LOCKED': return { ...state, unlocked: false, address: '', balance: 0 };
    case 'SET_BALANCE': return { ...state, balance: action.balance };
    case 'SET_SELECTED_TOKEN': return { ...state, selectedToken: action.token };
    case 'SET_PRICES': return { ...state, prices: action.prices, lastPricesUpdate: Date.now(), pricesChanged: action.changed };
    case 'SET_POSITIONS': return { ...state, positions: action.positions, summary: action.summary };
    case 'UPDATE_POSITION_QUOTE': return { ...state, positions: state.positions.map(p => p.id === action.positionId ? { ...p, _quotePrice: action.quotePrice, _quoteUsdcx: action.quoteUsdcx, _quoteLoading: false } : p) };
    case 'SET_TRADING': return { ...state, trading: action.trading };
    case 'SET_INITIAL_LOADING': return { ...state, initialLoading: action.loading };
    case 'PRESERVE_QUOTES': {
      const oldMap = new Map(state.positions.map(p => [p.id, p]));
      return { ...state, positions: action.positions.map(np => { const old = oldMap.get(np.id); return old?._quotePrice ? { ...np, _quotePrice: old._quotePrice, _quoteUsdcx: old._quoteUsdcx } : np; }) };
    }
    default: return state;
  }
}

interface DashboardContextValue {
  state: DashboardState; dispatch: React.Dispatch<DashboardAction>;
  loadData: () => Promise<void>; loadBalance: () => Promise<void>;
  unlockWallet: (p: string) => Promise<{ success: boolean; error?: string }>;
  lockWallet: () => Promise<void>;
  buyToken: (t: string, a: string) => Promise<{ success: boolean; error?: string; tokenAmount?: number }>;
  sellToken: (pid: string, amt: number) => Promise<{ success: boolean; error?: string; usdcxReceived?: number; profit?: number }>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);
export function useDashboard() { const ctx = useContext(DashboardContext); if (!ctx) throw new Error('useDashboard inside DashboardProvider'); return ctx; }

function fetchWithTimeout(url: string, ms = 15000): Promise<Response> {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const pricesRef = useRef(state.prices);
  const tradingRef = useRef(state.trading);
  const unlockedRef = useRef(state.unlocked);
  const positionsRef = useRef(state.positions);
  const loadingRef = useRef(false);

  useEffect(() => { pricesRef.current = state.prices; }, [state.prices]);
  useEffect(() => { tradingRef.current = state.trading; }, [state.trading]);
  useEffect(() => { unlockedRef.current = state.unlocked; }, [state.unlocked]);
  useEffect(() => { positionsRef.current = state.positions; }, [state.positions]);

  const loadData = useCallback(async () => {
    if (tradingRef.current || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [posR, priceR] = await Promise.all([fetchWithTimeout('/api/trade'), fetchWithTimeout('/api/prices', 30000)]);
      const posD = await posR.json(); const priceD = await priceR.json();
      dispatch({ type: 'PRESERVE_QUOTES', positions: posD.positions ?? [] });
      dispatch({ type: 'SET_POSITIONS', positions: posD.positions ?? [], summary: posD.summary ?? { totalInvested: 0, totalSold: 0, totalProfit: 0, openPositions: 0 } });
      if (priceD.prices) {
        const newPrices: Record<string, number> = {}; let changed = false; const old = pricesRef.current;
        for (const p of priceD.prices) { newPrices[p.token] = p.usdcxPrice; if (old[p.token] && Math.abs(old[p.token] - p.usdcxPrice) > 1e-9) changed = true; }
        dispatch({ type: 'SET_PRICES', prices: newPrices, changed });
      }
    } catch (e) { console.error('loadData:', e); }
    finally { loadingRef.current = false; }
  }, []);

  const loadBalance = useCallback(async () => {
    if (!unlockedRef.current) return;
    try { const r = await fetch('/api/balance'); const d = await r.json(); if (d.usdcxBalance != null) dispatch({ type: 'SET_BALANCE', balance: d.usdcxBalance }); }
    catch (e) { console.error('loadBalance:', e); }
  }, []);

  const unlockWallet = useCallback(async (password: string) => {
    try {
      const r = await fetch('/api/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unlock', password }) });
      const d = await r.json();
      if (d.success) { dispatch({ type: 'SET_UNLOCKED', address: d.address, btcAddress: d.btcAddress, taprootAddress: d.taprootAddress }); try { localStorage.setItem('wallet_pw', password); } catch {} return { success: true }; }
      return { success: false, error: d.error || 'Invalid password' };
    } catch (e: any) { return { success: false, error: e.message || 'Connection error' }; }
  }, []);

  const lockWallet = useCallback(async () => {
    await fetch('/api/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'lock' }) });
    dispatch({ type: 'SET_LOCKED' }); try { localStorage.removeItem('wallet_pw'); } catch {}
  }, []);

  const buyToken = useCallback(async (token: string, amount: string) => {
    dispatch({ type: 'SET_TRADING', trading: true });
    try {
      const r = await fetch('/api/trade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'buy', token, amount }) });
      const d = await r.json();
      if (d.success) { (window as any).__launchConfetti?.(); return { success: true, tokenAmount: d.tokenAmount }; }
      return { success: false, error: d.error || 'Buy failed' };
    } catch (e: any) { return { success: false, error: e.message }; }
    finally { dispatch({ type: 'SET_TRADING', trading: false }); }
  }, []);

  const sellToken = useCallback(async (positionId: string, sellAmount: number) => {
    dispatch({ type: 'SET_TRADING', trading: true });
    try {
      const pos = positionsRef.current.find(p => p.id === positionId);
      if (!pos) return { success: false, error: 'Position not found' };
      const r = await fetch('/api/trade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sell', token: pos.token, positionId, sellAmount }) });
      const d = await r.json();
      if (d.success) { (window as any).__launchConfetti?.(); return { success: true, usdcxReceived: d.usdcxReceived, profit: d.profit }; }
      return { success: false, error: d.error || 'Sell failed' };
    } catch (e: any) { return { success: false, error: e.message }; }
    finally { dispatch({ type: 'SET_TRADING', trading: false }); }
  }, []);

  // Init — show splash briefly, load data in background
  useEffect(() => {
    (async () => {
      try {
        try { const pw = localStorage.getItem('wallet_pw'); if (pw) { const r = await fetch('/api/wallet', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'unlock',password:pw}) }); const d = await r.json(); if (d.success) dispatch({ type:'SET_UNLOCKED',address:d.address,btcAddress:d.btcAddress,taprootAddress:d.taprootAddress }); else try{localStorage.removeItem('wallet_pw')}catch{} } } catch {}
        // Fallback: sync BTC addresses if wallet was already unlocked server-side
        try { const sr = await fetch('/api/wallet'); const sd = await sr.json(); if (sd.unlocked && (sd.btcAddress || sd.taprootAddress)) { dispatch({ type:'SET_UNLOCKED',address:sd.address,btcAddress:sd.btcAddress,taprootAddress:sd.taprootAddress }); } } catch {}
        await loadData(); await loadBalance();
      } catch (e) { console.error('Init:', e); }
      finally {
        // Hide splash after at most 2s
        setTimeout(() => dispatch({ type: 'SET_INITIAL_LOADING', loading: false }), 2000);
      }
    })();
  }, [loadData, loadBalance]);

  // Polling
  useEffect(() => { const id = setInterval(loadData, 30000); return () => clearInterval(id); }, [loadData]);

  // Fetch sell quotes (deduped via fetchingRef)
  const fetchingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const open = state.positions.filter((p: any) => p.status !== 'closed' && !fetchingRef.current.has(p.id) && !p._quotePrice);
    open.forEach(async (pos: any) => {
      const rem = pos.amount - (pos.sold_amount ?? 0); if (rem <= 0) return;
      fetchingRef.current.add(pos.id);
      const dec = pos.token === 'sBTC' ? 8 : pos.token === 'STX' ? 6 : 5;
      try { const r = await fetch(`/api/quote?token=${pos.token}&amount=${rem.toFixed(dec)}&direction=sell`); const d = await r.json(); if (d.usdcxOut>0) dispatch({ type:'UPDATE_POSITION_QUOTE',positionId:pos.id,quotePrice:d.price,quoteUsdcx:d.usdcxOut }); } catch {}
      fetchingRef.current.delete(pos.id);
    });
  }, [state.positions]);

  return (
    <DashboardContext.Provider value={{ state, dispatch, loadData, loadBalance, unlockWallet, lockWallet, buyToken, sellToken }}>
      {children}
    </DashboardContext.Provider>
  );
}
