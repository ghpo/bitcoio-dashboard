'use client';
import React, { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

interface AddressEntry {
  label: string;
  address: string;
  icon: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  stxAddress: string;
  btcAddress: string;
  taprootAddress: string;
}

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}&bgcolor=1a1f1c&color=22c55e&margin=8`;
}

function fmtAddr(addr: string) {
  if (!addr) return '';
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function copyAddr(addr: string, label: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(addr).then(() => toast.success(`${label} copied`), () => fallbackCopy(addr, label));
    } else {
      fallbackCopy(addr, label);
    }
  } catch {
    fallbackCopy(addr, label);
  }
}
function fallbackCopy(addr: string, label: string) {
  const ta = document.createElement('textarea');
  ta.value = addr;
  ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select(); ta.setSelectionRange(0, 99999);
  try { document.execCommand('copy'); toast.success(`${label} copied`); } catch { toast.error('Copy failed'); }
  document.body.removeChild(ta);
}

export function AddressesModal({ open, onClose, stxAddress, btcAddress, taprootAddress }: Props) {
  const [qrFor, setQrFor] = useState<string | null>(null);

  const entries: AddressEntry[] = [
    { label: 'STX', address: stxAddress, icon: '🔷' },
    { label: 'BTC (SegWit)', address: btcAddress, icon: '🟠' },
    { label: 'BTC (Taproot)', address: taprootAddress, icon: '🟢' },
  ];

  const hasAny = stxAddress || btcAddress || taprootAddress;
  if (!hasAny) return null;

  return (
    <Modal open={open} onClose={onClose} title="📋 Wallet Addresses">
      <div className="space-y-3">
        {entries.map((entry, i) => {
          if (!entry.address) return null;
          return (
            <div key={i}>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <span className="text-lg flex-shrink-0">{entry.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-white/25 uppercase tracking-wider mb-0.5">{entry.label}</div>
                  <button
                    onClick={() => setQrFor(qrFor === entry.label ? null : entry.label)}
                    className="text-[12px] font-mono text-white/60 hover:text-green-400 transition-colors truncate block w-full text-left"
                  >
                    {fmtAddr(entry.address)}
                  </button>
                </div>
                <button
                  onClick={() => copyAddr(entry.address, entry.label)}
                  className="ml-1 p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-white/40 hover:text-white/70 flex-shrink-0"
                  title="Copy address"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
              {qrFor === entry.label && (
                <div className="mt-2 flex flex-col items-center p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <img
                    src={qrUrl(entry.address)}
                    alt={`QR: ${entry.label}`}
                    className="w-40 h-40 rounded-lg"
                    loading="lazy"
                  />
                  <p className="mt-2 text-[10px] font-mono text-white/25 break-all text-center">{entry.address}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-center">
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
