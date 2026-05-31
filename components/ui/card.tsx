'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm p-5',
        glow && 'border-green-500/25 shadow-[0_0_24px_rgba(34,197,94,0.06)]',
        onClick && 'cursor-pointer hover:bg-white/[0.04] transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-[11px] font-medium uppercase tracking-[0.2em] text-white/35', className)}>
      {children}
    </h3>
  );
}
