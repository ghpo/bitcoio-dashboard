'use client';
import React, { useRef, useEffect, useState } from 'react';
import { useDashboard } from '@/providers/dashboard-provider';
import { fmtPrice } from '@/lib/utils';

const TOKENS = ['DOG', 'sBTC', 'STX'] as const;
const SCROLL_SPEED = 0.8; // pixels per frame (~48px/s at 60fps)

export function TickerBanner() {
  const { state } = useDashboard();
  const [text, setText] = useState('');
  const prevRef = useRef<Record<string, number>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Build ticker text
  useEffect(() => {
    const parts: string[] = [];
    let volatile = false;
    for (const t of TOKENS) {
      const cur = state.prices[t];
      if (!cur) continue;
      const prev = prevRef.current[t];
      if (prev && cur !== prev) {
        const chg = ((cur - prev) / prev) * 100;
        const arrow = chg > 0 ? '▲' : chg < 0 ? '▼' : '';
        const color = chg > 0 ? '#4ade80' : chg < 0 ? '#f87171' : 'rgba(255,255,255,0.3)';
        parts.push(`<span style="color:${color}">${t} $${fmtPrice(cur)} ${arrow}${Math.abs(chg).toFixed(1)}%</span>`);
        if (Math.abs(chg) > 3) volatile = true;
      } else {
        parts.push(`<span style="color:rgba(255,255,255,0.3)">${t} $${fmtPrice(cur)}</span>`);
      }
      prevRef.current[t] = cur;
    }
    if (parts.length === 0) { setText('Carregando preços...'); return; }
    // High volatility = opportunity (green), low = stagnant (red)
    const vColor = volatile ? '#4ade80' : '#f87171';
    const vEmoji = volatile ? '🟢' : '🔴';
    const vLabel = volatile ? 'Alta volatilidade' : 'Baixa volatilidade';
    const joined = parts.join('  ·  ');
    setText(`${joined}  |  <span style="color:${vColor}">${vEmoji} ${vLabel}</span>`);
  }, [state.prices]);

  // RAF-based seamless scroll using transform
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !text) return;

    const startRaf = requestAnimationFrame(() => {
      const copyWidth = content.scrollWidth / 4; // 4 copies in repeated string
      if (copyWidth === 0) return;

      const scroll = () => {
        offsetRef.current += SCROLL_SPEED;
        if (offsetRef.current >= copyWidth) {
          offsetRef.current -= copyWidth;
        }
        content.style.transform = `translateX(${-offsetRef.current}px)`;
        rafRef.current = requestAnimationFrame(scroll);
      };
      rafRef.current = requestAnimationFrame(scroll);
    });

    return () => {
      cancelAnimationFrame(startRaf);
      cancelAnimationFrame(rafRef.current);
    };
  }, [text]);

  if (!text) return null;

  // Duplicate text enough times to fill 3x viewport
  const repeated = `${text}  ⏤  ${text}  ⏤  ${text}  ⏤  ${text}`;

  return (
    <div className="overflow-hidden whitespace-nowrap rounded-full bg-white/[0.02] border border-white/[0.04] px-3 py-1 max-w-[280px]">
      <div ref={contentRef} style={{ willChange: 'transform' }}>
        <span className="text-[10px] text-white/30 whitespace-nowrap" dangerouslySetInnerHTML={{ __html: repeated }} />
      </div>
    </div>
  );
}
