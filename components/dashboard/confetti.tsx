'use client';

import React, { useEffect, useRef, useCallback } from 'react';

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fire = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Array<{
      x: number; y: number; w: number; h: number;
      color: string; vx: number; vy: number;
      rotation: number; rv: number; opacity: number;
    }> = [];

    const colors = ['#22c55e', '#4ade80', '#facc15', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#fff'];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.3 - canvas.height * 0.3,
        w: Math.random() * 8 + 4,
        h: Math.random() * 4 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rv: (Math.random() - 0.5) * 8,
        opacity: 1,
      });
    }

    let frame = 0;
    function animate() {
      if (!ctx || !canvas) return;
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rotation += p.rv;
        if (frame > 40) p.opacity -= 0.015;
        if (p.opacity <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive && frame < 120) {
        requestAnimationFrame(animate);
      } else {
        canvas.style.display = 'none';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    (window as any).__launchConfetti = fire;
    return () => { delete (window as any).__launchConfetti; };
  }, [fire]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none', position: 'fixed', inset: 0, zIndex: 998, pointerEvents: 'none' }}
    />
  );
}
