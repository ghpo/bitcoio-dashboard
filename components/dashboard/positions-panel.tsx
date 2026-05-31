'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '@/providers/dashboard-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { fmtToken, fmtPrice, fmtUsdcx, calcPnl } from '@/lib/utils';
import { toast } from 'sonner';
import { TOKEN_DECIMALS } from '@/types';
import { usePending } from '@/providers/pending-provider';

export function PositionsPanel() {
  const { state, sellToken, loadData, loadBalance, dispatch } = useDashboard();
  const { addPending, removePending } = usePending();
  // Countdown timer for next price update (30s interval)
  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    const tick = () => {
      const next = (state.lastPricesUpdate ?? 0) + 30000;
      setCountdown(Math.max(0, Math.ceil((next - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.lastPricesUpdate]);

  const open = state.positions.filter(p => p.status !== 'closed');
  const [sellModal,setSellModal]=useState<string|null>(null);
  const [sellPct,setSellPct]=useState(100);
  const [customAmt,setCustomAmt]=useState('');
  const [selling,setSelling]=useState(false);
  const [quoteLoading,setQuoteLoading]=useState(false);
  const [modalQuote,setModalQuote]=useState<{price:number;usdcx:number}|null>(null);
  const fetchingRef = useRef<Set<string>>(new Set());

  const selectedPos=sellModal?open.find(p=>p.id===sellModal):null;
  const selectedRem=selectedPos?selectedPos.amount-(selectedPos.sold_amount??0):0;
  const sellAmt=sellPct===0?parseFloat(customAmt)||0:selectedRem*sellPct/100;
  const sellPrice = modalQuote?.price ?? selectedPos?._quotePrice ?? state.prices[selectedPos?.token??''];
  const quoteReady = !!sellPrice && sellPrice > 0;

  // Fetch quote when sell modal opens
  useEffect(() => {
    if (!sellModal || !selectedPos) return;
    // Already have quote?
    if (selectedPos._quotePrice && selectedPos._quotePrice > 0) {
      setModalQuote({ price: selectedPos._quotePrice, usdcx: selectedPos._quoteUsdcx ?? (selectedRem * selectedPos._quotePrice) });
      setQuoteLoading(false);
      return;
    }
    // Already fetching?
    if (fetchingRef.current.has(selectedPos.id)) { setQuoteLoading(true); return; }
    // Fetch now
    setQuoteLoading(true);
    setModalQuote(null);
    fetchingRef.current.add(selectedPos.id);
    const rem = selectedPos.amount - (selectedPos.sold_amount ?? 0);
    const dec = selectedPos.token === 'sBTC' ? 8 : selectedPos.token === 'STX' ? 6 : 5;
    (async () => {
      try {
        const r = await fetch(`/api/quote?token=${selectedPos.token}&amount=${rem.toFixed(dec)}&direction=sell`);
        const d = await r.json();
        if (d.usdcxOut > 0) {
          setModalQuote({ price: d.price, usdcx: d.usdcxOut });
          dispatch({ type:'UPDATE_POSITION_QUOTE', positionId: selectedPos.id, quotePrice: d.price, quoteUsdcx: d.usdcxOut });
        }
      } catch {}
      finally {
        fetchingRef.current.delete(selectedPos.id);
        setQuoteLoading(false);
      }
    })();
  }, [sellModal, selectedPos?.id]);

  // Reset when modal closes
  useEffect(() => {
    if (!sellModal) { setQuoteLoading(false); setModalQuote(null); }
  }, [sellModal]);

  const handleSell=useCallback(async()=>{
    if(!selectedPos||sellAmt<=0||!quoteReady)return;
    setSelling(true);
    const pid = addPending(`Sell ${selectedPos.token}`);
    const r=await sellToken(selectedPos.id,sellAmt);
    setSelling(false);
    if(r.success){setSellModal(null);toast.success(`Sold ${fmtToken(sellAmt,TOKEN_DECIMALS[selectedPos.token]??5)} ${selectedPos.token}`);await loadData();loadBalance();}
    else toast.error(r.error||'Sell failed');
    removePending(pid);
  },[selectedPos,sellAmt,quoteReady,sellToken,loadData,loadBalance]);

  if(open.length===0)return <div className="text-center py-20"><div className="text-3xl mb-3">📭</div><p className="text-sm text-white/15">No open positions</p></div>;

  if(open.length===0)return <div className="text-center py-20"><div className="text-3xl mb-3">📭</div><p className="text-sm text-white/15">No open positions</p></div>;

  return (<>
    {/* Countdown bar */}
    <div className="flex items-center justify-center gap-1.5 mb-3">
      <span className="text-[10px] text-white/15 uppercase tracking-wider">Next update</span>
      <span className={`text-[11px] font-mono tabular-nums ${countdown <= 5 ? 'text-amber-400' : 'text-white/25'}`}>
        {countdown}s
      </span>
      <div className="w-12 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div className="h-full bg-green-500/30 rounded-full transition-all duration-1000 ease-linear" style={{width: `${((30 - countdown) / 30) * 100}%`}}/>
      </div>
    </div>
    <div className="space-y-3">
      {open.map((pos,i)=>{const rem=pos.amount-(pos.sold_amount??0);const price=pos._quotePrice||state.prices[pos.token]||pos.entry_price;const isRealQuote=!!pos._quotePrice&&pos._quotePrice>0;const isLoadingQuote=!pos._quotePrice||pos._quotePrice<=0;const{pnl,pnlPct}=calcPnl({...pos,_quotePrice:pos._quotePrice},state.prices[pos.token]);const pnlSign=pnl>=0?'+':'';const pnlClr=pnl>=0?'text-green-400':'text-red-400';
      return <motion.div key={pos.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}><Card glow>
        <div className="flex justify-between items-start mb-3"><div><span className="font-semibold text-sm">{pos.token}</span><span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 uppercase">{pos.status}</span></div>
          <Button variant="danger" size="sm" onClick={()=>{setSellModal(pos.id);setSellPct(100);}}>Sell</Button></div>
        <div className="grid grid-cols-4 gap-3 text-xs mb-3">
          <div><div className="text-[10px] text-white/25 mb-0.5">Amount</div><div className="text-white/70">{fmtToken(rem,TOKEN_DECIMALS[pos.token]??5)}</div></div>
          <div><div className="text-[10px] text-white/25 mb-0.5">Entry</div><div className="text-white/70">${fmtPrice(pos.entry_price)}</div></div>
          <div><div className="text-[10px] text-white/25 mb-0.5">Current</div><div className={isLoadingQuote?'text-amber-400/60 text-[11px]':'text-white/70'}>{isLoadingQuote?'loading...':<>{'$'}{fmtPrice(price)}{isRealQuote?' ✅':''}</>}</div></div>
          <div><div className="text-[10px] text-white/25 mb-0.5">Value</div><div className="text-white/70">${fmtUsdcx(pos.entry_usdcx||(pos.amount*pos.entry_price))}</div></div>
        </div>
        <div className="pt-3 border-t border-white/[0.05] flex justify-between items-center"><span className="text-[11px] text-white/30">P&L</span><span className={`text-xs font-semibold ${pnlClr}`}>{pnlSign}{fmtUsdcx(pnl)} USDCx <span className="text-[10px] opacity-70">({pnlSign}{pnlPct.toFixed(1)}%)</span></span></div>
      </Card></motion.div>})}
    </div>

    <Modal open={!!sellModal} onClose={()=>setSellModal(null)} title={<span>💰 Sell {selectedPos?.token??''} <span className={`text-[11px] font-mono ml-2 ${countdown <= 5 ? 'text-amber-400' : 'text-white/25'}`}>⟳ {countdown}s</span></span>}>
      {selectedPos&&(<>
        <div className="space-y-2 mb-4 p-4 rounded-xl bg-white/[0.03] text-xs">
          <div className="flex justify-between"><span className="text-white/35">Remaining</span><span>{fmtToken(selectedRem,TOKEN_DECIMALS[selectedPos.token]??5)}</span></div>
          <div className="flex justify-between"><span className="text-white/35">Entry Price</span><span>${fmtPrice(selectedPos.entry_price)}</span></div>
          <div className="flex justify-between">
            <span className="text-white/35">Sell Price</span>
            {quoteLoading ? (
              <span className="text-amber-400/60 flex items-center gap-1">
                <span className="inline-block w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin"/>
                fetching...
              </span>
            ) : quoteReady ? (
              <span className="text-green-400">${fmtPrice(sellPrice)} ✅</span>
            ) : (
              <span className="text-red-400/60">unavailable</span>
            )}
          </div>
          {quoteReady && (
            <>
              <div className="flex justify-between"><span className="text-white/35">If Sold Now</span><span className={sellPrice >= selectedPos.entry_price ? 'text-green-400/80' : 'text-red-400/80'}>${fmtUsdcx(sellAmt * sellPrice)}</span></div>
              <div className="flex justify-between pt-2 border-t border-white/[0.04]">
                <span className="text-white/35">P&L</span>
                {(() => {
                  const sellPnl = (sellPrice - selectedPos.entry_price) * sellAmt;
                  const sellPnlPct = selectedPos.entry_price > 0 ? ((sellPrice - selectedPos.entry_price) / selectedPos.entry_price) * 100 : 0;
                  const sign = sellPnl >= 0 ? '+' : '';
                  const clr = sellPnl >= 0 ? 'text-green-400' : 'text-red-400';
                  return <span className={`font-semibold ${clr}`}>{sign}${fmtUsdcx(Math.abs(sellPnl))} <span className="text-[10px] opacity-70">({sign}{sellPnlPct.toFixed(1)}%)</span></span>;
                })()}
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[25,50,100].map(pct=>(<button key={pct} onClick={()=>{setSellPct(pct);setCustomAmt('')}} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${sellPct===pct?'bg-red-500/15 border border-red-500/25 text-red-400':'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60'}`}>{pct}%</button>))}
          <button onClick={()=>setSellPct(0)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${sellPct===0?'bg-red-500/15 border border-red-500/25 text-red-400':'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60'}`}>Custom</button>
        </div>
        {sellPct===0&&<input type="number" value={customAmt} onChange={e=>setCustomAmt(e.target.value)} placeholder="Custom amount" className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.1] text-sm text-white placeholder:text-white/20 outline-none focus:border-red-500/30 mb-4"/>}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={()=>setSellModal(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleSell} loading={selling} disabled={!quoteReady}>Confirm Sell</Button>
        </div>
      </>)}
    </Modal>
  </>);
}
