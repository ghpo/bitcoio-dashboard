'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '@/providers/dashboard-provider';
import { fmtUsdcx } from '@/lib/utils';

export function StatsBar() {
  const { state } = useDashboard();
  let currentValue=0,totalInvested=0,totalSold=0;
  for(const p of state.positions){totalInvested+=p.entry_usdcx||(p.amount*p.entry_price);totalSold+=p.sold_usdcx||0;if(p.status!=='closed'){const rem=p.amount-(p.sold_amount||0);const price=p._quotePrice||state.prices[p.token]||p.entry_price;currentValue+=rem*price}}
  const realPnl=(currentValue+totalSold)-totalInvested;
  const openCount=state.positions.filter(p=>p.status!=='closed').length;
  const stats=[
    {label:'Invested',value:`$${fmtUsdcx(totalInvested)}`,color:'text-white/80'},
    {label:'Sold',value:`$${fmtUsdcx(totalSold)}`,color:'text-white/80'},
    {label:'P&L',value:`${realPnl>=0?'+':''}$${fmtUsdcx(Math.abs(realPnl))}`,color:realPnl>0?'text-green-400':realPnl<0?'text-red-400':'text-white/50'},
    {label:'Open',value:String(openCount),color:'text-white/80'},
  ];
  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {stats.map((s,i)=>(
        <motion.div key={s.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.05*i,duration:0.3}} className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.04]">
          <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{s.label}</div>
          <motion.div key={`${s.label}-${s.value}`} initial={{scale:1}} animate={{scale:[1,1.02,1]}} transition={{duration:0.3}} className={`text-[15px] font-semibold ${s.color}`}>{s.value}</motion.div>
        </motion.div>
      ))}
    </div>
  );
}
