'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingOverlayProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
}

export function LoadingOverlay({ visible, title = 'Processing...', subtitle = 'Confirming on-chain' }: LoadingOverlayProps) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!visible) { setElapsed(0); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            {/* Spinner */}
            <div className="w-12 h-12 mx-auto mb-5 relative">
              <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-500 animate-spin" />
            </div>

            <p className="text-[15px] font-medium text-white">{title}</p>
            <p className="text-[11px] text-white/25 mt-1.5">
              {subtitle}{elapsed > 0 ? ` (${elapsed}s)` : ''}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
