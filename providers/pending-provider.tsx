'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

interface PendingTx {
  id: string;
  label: string;
  time: Date;
  done?: boolean;
}

interface PendingContextValue {
  txs: PendingTx[];
  addPending: (label: string) => string;
  removePending: (id: string) => void;
}

const PendingContext = createContext<PendingContextValue>({
  txs: [],
  addPending: () => '',
  removePending: () => {},
});

export function usePending() {
  return useContext(PendingContext);
}

let _id = 0;

export function PendingProvider({ children }: { children: React.ReactNode }) {
  const [txs, setTxs] = useState<PendingTx[]>([]);

  const addPending = useCallback((label: string) => {
    const id = 'ptx_' + (++_id);
    setTxs(prev => [...prev, { id, label, time: new Date() }]);
    return id;
  }, []);

  const removePending = useCallback((id: string) => {
    setTxs(prev => prev.map(t => t.id === id ? { ...t, done: true } : t));
    setTimeout(() => setTxs(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <PendingContext.Provider value={{ txs, addPending, removePending }}>
      {children}
    </PendingContext.Provider>
  );
}
