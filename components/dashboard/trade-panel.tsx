'use client';
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '@/providers/dashboard-provider';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { fmtToken, fmtPrice, fmtUsdcx } from '@/lib/utils';
import { toast } from 'sonner';
import { TOKEN_LIST, TOKEN_DECIMALS, type TokenSymbol } from '@/types';
import { usePending } from '@/providers/pending-provider';

export function TradePanel() {
  const { state, dispatch, buyToken, loadData, loadBalance } = useDashboard();
  const { addPending, removePending } = usePending();
  const [amount,setAmount]=useState('');
  const [showConfirm,setShowConfirm]=useState(false);
  const [showError,setShowError]=useState('');
  const [buying,setBuying]=useState(false);
  const selected=state.selectedToken as TokenSymbol;
  const price=state.prices[selected];
  const usdcxAmt=parseFloat(amount)||0;
  const receive=price&&usdcxAmt?usdcxAmt/price:0;
  const balanceAfter=state.balance-usdcxAmt;

  const handleBuyClick=()=>{
    if(!amount||usdcxAmt<=0)return;
    if(!state.unlocked){setShowError('🔐 Carteira bloqueada.\nClique em Unlock para desbloquear.');return;}
    if(!price){setShowError('📡 Preço ainda não carregou.\nAguarde alguns segundos.');return;}
    if(usdcxAmt>state.balance){setShowError(`💰 Saldo insuficiente.\n\nVocê tem $${fmtUsdcx(state.balance)}\nQuer gastar $${fmtUsdcx(usdcxAmt)}`);return;}
    setShowConfirm(true);
  };

  const handleBuy=useCallback(async()=>{
    if(!amount||usdcxAmt<=0)return;
    setBuying(true);
    const pid=addPending(`Buy ${selected}`);
    try {
      const r=await buyToken(selected,amount);
      setBuying(false);setShowConfirm(false);
      if(r.success){setAmount('');toast.success(`Bought ${fmtToken(r.tokenAmount??0,TOKEN_DECIMALS[selected])} ${selected}`);await loadData();loadBalance();}
      else toast.error(r.error||'Buy failed');
      removePending(pid);
    } catch(e:any){setBuying(false);setShowConfirm(false);removePending(pid);}
  },[amount,selected,buyToken,loadData,loadBalance]);

  return (<>
    <Card>
      {/* Token selector */}
      <div className="flex gap-2 mb-4">
        {TOKEN_LIST.map(tok=>{
          const tokPrice=state.prices[tok];
          return (
            <button key={tok} onClick={()=>dispatch({type:'SET_SELECTED_TOKEN',token:tok})}
              className={`relative flex-1 px-3 py-3 rounded-xl text-center transition-all duration-200 ${
                selected===tok
                  ?'bg-green-500/10 border border-green-500/25'
                  :'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]'
              }`}>
              {selected===tok&&<motion.div layoutId="selectedToken" className="absolute inset-0 rounded-xl bg-green-500/[0.08]" transition={{type:'spring',duration:0.4,bounce:0.15}}/>}
              <span className={`relative z-10 text-sm font-semibold ${selected===tok?'text-green-400':'text-white/60'}`}>{tok}</span>
              <div className={`relative z-10 text-[11px] mt-0.5 font-mono ${selected===tok?'text-green-400/60':'text-white/25'}`}>{tokPrice?`$${fmtPrice(tokPrice)}`:'---'}</div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.05] mb-4"/>

      {/* Balance */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] text-white/25 uppercase tracking-wider">Saldo</span>
        <span className="text-xs text-white/40 font-mono">
          {state.unlocked ? `$${fmtUsdcx(state.balance)}` : 'Locked'}
        </span>
      </div>

      {/* Amount input — big, centered */}
      <div className="text-center mb-1">
        <div className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Amount (USDCx)</div>
        <div className="inline-flex items-baseline gap-1 justify-center">
          <span className="text-white/15 text-3xl font-light">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            pattern="[0-9]*"
            value={amount}
            onChange={e=>setAmount(e.target.value)}
            placeholder="0.00"
            className="w-40 bg-transparent text-center text-4xl font-bold text-white placeholder:text-white/6 outline-none"
          />
        </div>
      </div>

      {/* Balance after */}
      {usdcxAmt>0&&state.unlocked&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="text-center mb-4 pt-1">
          <span className="text-[11px] text-white/30">
            Após compra: <span className={balanceAfter>=0?'text-white/40':'text-red-400 font-medium'}>${fmtUsdcx(balanceAfter)}</span>
          </span>
        </motion.div>
      )}

      {/* Price preview */}
      {usdcxAmt>0&&price>0&&(
        <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
          className="mb-5 py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.04] text-center">
          <span className="text-xs text-white/35">Você recebe </span>
          <span className="text-sm font-semibold text-green-400">{fmtToken(receive,TOKEN_DECIMALS[selected])}</span>
          <span className="text-xs text-green-400 ml-1">{selected}</span>
          <div className="text-[10px] text-white/15 mt-0.5">@ ${fmtPrice(price)}/{selected}</div>
        </motion.div>
      )}

      {/* Buy button */}
      <div className="mt-4">
      <Button variant="primary" size="lg" className="w-full" onClick={handleBuyClick}>
        Buy {selected}
      </Button>
      </div>
    </Card>

    <Modal open={showConfirm} onClose={()=>setShowConfirm(false)} title="🛒 Confirm Buy">
      <div className="space-y-3 mb-5 p-4 rounded-xl bg-white/[0.03] text-sm">
        <div className="flex justify-between"><span className="text-white/35">Token</span><span className="font-semibold">{selected}</span></div>
        <div className="flex justify-between"><span className="text-white/35">Amount</span><span>${fmtUsdcx(usdcxAmt)}</span></div>
        <div className="flex justify-between"><span className="text-white/35">Price</span><span>${fmtPrice(price??0)}</span></div>
        <div className="flex justify-between"><span className="text-white/35">Receive</span><span className="font-semibold text-green-400">{fmtToken(receive,TOKEN_DECIMALS[selected])} {selected}</span></div>
      </div>
      <div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={()=>setShowConfirm(false)}>Cancel</Button><Button variant="primary" className="flex-1" onClick={handleBuy} loading={buying}>Confirm</Button></div>
    </Modal>

    <Modal open={!!showError} onClose={()=>setShowError('')} title="⚠️ Não foi possível">
      <p className="text-sm text-white/60 whitespace-pre-line mb-6">{showError}</p>
      <Button variant="primary" className="w-full" onClick={()=>setShowError('')}>Entendi</Button>
    </Modal>
  </>);
}
