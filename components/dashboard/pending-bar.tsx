'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingTx {
  id: string;
  label: string;
  time: Date;
  done?: boolean;
  doneTime?: Date;
}

let _pendingId = 0;

export function usePending() {
  const [txs, setTxs] = useState<PendingTx[]>([]);

  const add = useCallback((label: string) => {
    const id = 'tx_' + (++_pendingId);
    setTxs(prev => [...prev, { id, label, time: new Date() }]);
    return id;
  }, []);

  const remove = useCallback((id: string) => {
    setTxs(prev => prev.map(t => t.id === id ? { ...t, done: true, doneTime: new Date() } : t));
    setTimeout(() => {
      setTxs(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return { txs, add, remove };
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

export function PendingBar({ txs }: { txs: PendingTx[] }) {
  if (txs.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/[0.06] px-4 py-2.5 z-[100]"
    >
      <div className="max-w-lg mx-auto flex items-center gap-3 overflow-x-auto">
        {txs.map(tx => (
          <div key={tx.id}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] whitespace-nowrap flex-shrink-0 transition-all ${
              tx.done
                ? 'bg-green-500/5 border-green-500/15 text-green-400/70'
                : 'bg-white/[0.03] border-white/[0.06] text-white/50'
            }`}>
            <span>{tx.done ? '✅' : <span className="inline-block w-3 h-3 border border-white/20 border-t-green-400 rounded-full animate-spin" />}</span>
            <span>{tx.label}</span>
            <span className="text-[9px] text-white/15">{fmtTime(tx.time)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
