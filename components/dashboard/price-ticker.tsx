'use client';
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '@/providers/dashboard-provider';
import { fmtPrice, fmtTime, cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const NAMES=['DOG','sBTC','STX'];

export function PriceTicker() {
  const { state, loadData } = useDashboard();
  const prevPrices=useRef<Record<string,number>>({});
  const [flashing,setFlashing]=useState<Record<string,'up'|'down'|null>>({});
  React.useEffect(()=>{
    const nf:Record<string,'up'|'down'|null>={};
    for(const t of NAMES){const cur=state.prices[t];const prev=prevPrices.current[t];if(prev&&cur&&Math.abs(cur-prev)>1e-9){nf[t]=cur>prev?'up':'down';setTimeout(()=>setFlashing(f=>({...f,[t]:null})),800)}}
    if(Object.keys(nf).length>0)setFlashing(f=>({...f,...nf}));
    prevPrices.current={...state.prices};
  },[state.prices]);
  const isLoading=Object.keys(state.prices).length===0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"/></span>
            Live Prices
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          {state.lastPricesUpdate&&<span className="text-[9px] text-white/12">Updated {fmtTime(new Date(state.lastPricesUpdate))}</span>}
          <button onClick={loadData} className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 transition-colors">🔄</button>
        </div>
      </CardHeader>
      <div className="space-y-2.5">
        {isLoading?[1,2,3].map(i=><Skeleton key={i} className="h-5 w-full"/>):NAMES.map(t=>{
          const price=state.prices[t];const flash=flashing[t];
          return <div key={t} className="flex justify-between items-center py-0.5"><span className="text-xs font-medium text-white/50">{t}</span>
            <motion.span key={`${t}-${price}`} className={cn('text-xs font-mono transition-colors duration-300',flash==='up'&&'text-green-400',flash==='down'&&'text-red-400',!flash&&'text-white/70')}>{price?`$${fmtPrice(price)}`:'---'}</motion.span>
          </div>;
        })}
      </div>
    </Card>
  );
}
