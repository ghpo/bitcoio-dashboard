'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardProvider, useDashboard } from '@/providers/dashboard-provider';
import { PendingProvider, usePending } from '@/providers/pending-provider';
import { Header } from '@/components/dashboard/header';
import { StatsBar } from '@/components/dashboard/stats-bar';
import { TradePanel } from '@/components/dashboard/trade-panel';
import { PositionsPanel } from '@/components/dashboard/positions-panel';
import { HistoryPanel } from '@/components/dashboard/history-panel';
import { Confetti } from '@/components/dashboard/confetti';
import { PendingBar } from '@/components/dashboard/pending-bar';
import { TickerBanner } from '@/components/dashboard/ticker-banner';

const TABS = [{ id:'trade',label:'Trade' },{ id:'positions',label:'Posições' },{ id:'history',label:'Histórico' }];

function DashboardContent() {
  const { state } = useDashboard();
  const { txs } = usePending();
  const [activeTab, setActiveTab] = useState('trade');

  return (<>
    <Confetti />
    <style>{`
      @keyframes splash-out { 0%,70% { opacity:1; } 99% { opacity:0; pointer-events:auto; } 100% { opacity:0; pointer-events:none; } }
      #splash-overlay { animation: splash-out 2s ease-out forwards; z-index:9999; }
      @keyframes fadeInUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeInScale { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    `}</style>
    <div id="splash-overlay" className="fixed inset-0 bg-[#060a08] flex flex-col items-center justify-center">
      <div className="mb-5" style={{animation:'fadeInScale 0.5s 0.1s both'}}>
        <img src="/logo.jpg" alt="bitcoio" className="w-40 h-auto rounded-2xl shadow-[0_0_32px_rgba(34,197,94,0.3)] object-contain" />
      </div>
      <h1 className="text-xl font-bold tracking-tight" style={{animation:'fadeInUp 0.5s 0.3s both'}}>bitcoio</h1>
      <div className="mt-4" style={{animation:'fadeIn 0.3s 0.5s both'}}><div className="w-5 h-5 border-2 border-white/10 border-t-green-500 rounded-full animate-spin"/></div>
      <p className="mt-3 text-xs text-white/20" style={{animation:'fadeIn 0.3s 0.6s both'}}>Loading dashboard...</p>
    </div>

    <motion.main initial={{ opacity: 1 }} className="h-screen flex flex-col max-w-lg mx-auto overflow-hidden">
      {/* Sticky Header */}
      <div className="flex-shrink-0 px-4 pt-5 pb-2 bg-[#060a08] z-10">
        <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="mb-1 flex items-center gap-3">
          <img src="/logo.jpg" alt="bitcoio" className="w-24 h-auto rounded-xl flex-shrink-0 object-contain" />
          <div className="flex-shrink-0">
            
          </div>
          <div className="flex-1 min-w-0">
            <TickerBanner />
          </div>
        </motion.div>
        <Header />
        <StatsBar />
        <div className="flex gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 px-5 py-2 rounded-full text-xs font-medium transition-colors duration-200 ${activeTab === tab.id ? 'text-green-400' : 'text-white/35 hover:text-white/60'}`}>
              {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute inset-0 rounded-full bg-green-500/[0.12]" transition={{ type:'spring',duration:0.4,bounce:0.15 }}/>}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-6 }} transition={{ duration:0.2 }}>
            {activeTab === 'trade' && <div className="space-y-3 pt-3"><TradePanel /></div>}
            {activeTab === 'positions' && <PositionsPanel />}
            {activeTab === 'history' && <HistoryPanel />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer — fixed at bottom */}
      <div className="flex-shrink-0 px-4 py-3 bg-[#060a08] border-t border-white/[0.03]">
        <div className="flex items-center justify-center gap-2 text-[10px] text-white/12">
          <span>Developed by</span>
          <a href="https://x.com/ghpo2k" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/40 transition-colors">
            <svg className="w-3 h-3 inline-block" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://x.com/ghpo2k" target="_blank" rel="noopener noreferrer" className="text-white/15 hover:text-white/30 transition-colors font-medium">ghpo2k</a>
          <span className="text-white/08">·</span>
          <span>2026</span>
        </div>
      </div>
    </motion.main>

    <PendingBar txs={txs} />
  </>);
}

export function DashboardPage() {
  return (
    <DashboardProvider>
      <PendingProvider>
        <DashboardContent />
      </PendingProvider>
    </DashboardProvider>
  );
}
