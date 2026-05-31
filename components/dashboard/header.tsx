'use client';
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '@/providers/dashboard-provider';
import { Button } from '@/components/ui/button';
import { fmtShortAddr, fmtUsdcx, fmtToken } from '@/lib/utils';
import { toast } from 'sonner';
import { TOKEN_DECIMALS } from '@/types';
import { usePending } from '@/providers/pending-provider';
import { SettingsModal } from '@/components/dashboard/settings-modal';
import { AddressesModal } from '@/components/dashboard/addresses-modal';

export function Header() {
  const { state, unlockWallet, lockWallet, loadData, loadBalance, buyToken, sellToken } = useDashboard();
  const { addPending, removePending } = usePending();
  const [showUnlock, setShowUnlock] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [swapAmount, setSwapAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState<'sbtc2usdc'|'usdc2sbtc'>('usdc2sbtc');
  const [swapping, setSwapping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);

  const handleUnlock = async () => { if(!password)return; setUnlocking(true); const r=await unlockWallet(password); setUnlocking(false); if(r.success){setShowUnlock(false);setPassword('');toast.success('Wallet unlocked')}else toast.error(r.error||'Invalid password') };
  const handleLock = async () => { await lockWallet(); toast('Wallet locked') };

  const amt = parseFloat(swapAmount)||0; const sbtcPrice=state.prices['sBTC']??0;
  const preview = amt>0&&sbtcPrice>0 ? (swapDirection==='sbtc2usdc'?`≈ $${fmtUsdcx(amt*sbtcPrice)} USDCx`:`≈ ${fmtToken(amt/sbtcPrice,8)} sBTC`) : '';

  const handleSwap = useCallback(async()=>{
    if(!amt||amt<=0){toast.error('Enter an amount');return}
    setSwapping(true);
    const pid = addPending(`Swap ${swapDirection==='usdc2sbtc'?'USDCx→sBTC':'sBTC→USDCx'}`);
    try{
      if(swapDirection==='usdc2sbtc'){const r=await buyToken('sBTC',String(amt));if(r.success){setSwapAmount('');toast.success(`Bought ${fmtToken(r.tokenAmount??0,8)} sBTC`)}else toast.error(r.error||'Buy failed')}
      else{const pos=state.positions.find(p=>p.token==='sBTC'&&p.status!=='closed');if(!pos){toast.error('No sBTC position');setSwapping(false);return}const rem=pos.amount-(pos.sold_amount??0);const r=await sellToken(pos.id,Math.min(amt,rem));if(r.success){setSwapAmount('');toast.success(`Sold for $${fmtUsdcx(r.usdcxReceived??0)}`)}else toast.error(r.error||'Sell failed')}
      await loadData();loadBalance();
    }catch(e:any){toast.error(e.message)}
    finally{setSwapping(false);removePending(pid);}
  },[amt,swapDirection,buyToken,sellToken,state.positions,loadData,loadBalance]);

  return (<>
    <div className="flex items-center gap-3 mb-3">
      <motion.div animate={{scale:state.unlocked?[1,1.2,1]:1}} transition={{repeat:state.unlocked?Infinity:0,duration:2}} className={`w-2 h-2 rounded-full flex-shrink-0 ${state.unlocked?'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]':'bg-white/20'}`}/>
      <span className="text-[11px] text-white/40 font-mono truncate">{state.unlocked?fmtShortAddr(state.address):'Not connected'}</span>
      {state.unlocked&&<motion.span initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} className="text-sm font-bold text-green-400 flex-shrink-0">{state.balance>0?`💰 $${fmtUsdcx(state.balance)}`:'💰 ...'}</motion.span>}
      <div className="flex-1"/>
      {state.unlocked&&<Button size="sm" variant="ghost" onClick={()=>setShowAddresses(true)}>📋</Button>}
      <Button size="sm" variant="ghost" onClick={()=>setShowSettings(true)}>⚙️</Button>
      {state.unlocked?<Button size="sm" variant="ghost" onClick={handleLock}>Lock</Button>:<Button size="sm" variant="ghost" onClick={()=>setShowUnlock(true)}>🔐 Unlock</Button>}
    </div>

    {showUnlock&&(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setShowUnlock(false)}/>
        <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="relative z-10 w-full max-w-xs rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#1a1f1c] to-[#111412] p-6" onClick={e=>e.stopPropagation()}>
          <h2 className="text-lg font-semibold mb-3">🔐 Unlock Wallet</h2>
          <p className="text-xs text-white/35 mb-4">Enter your wallet password to enable trading.</p>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleUnlock()} placeholder="Password" autoFocus className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.1] text-sm text-white placeholder:text-white/20 outline-none focus:border-green-500/30 mb-4"/>
          <div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={()=>setShowUnlock(false)}>Cancel</Button><Button variant="primary" className="flex-1" onClick={handleUnlock} loading={unlocking}>Unlock</Button></div>
        </motion.div>
      </div>
    )}

    <SettingsModal open={showSettings} onClose={()=>setShowSettings(false)} />
    <AddressesModal open={showAddresses} onClose={()=>setShowAddresses(false)} stxAddress={state.address} btcAddress={state.btcAddress} taprootAddress={state.taprootAddress} />
  </>);
}
