'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<string>('import');

  // Import Seed
  const [seed, setSeed] = useState('');
  const [importPw, setImportPw] = useState('');
  const [importing, setImporting] = useState(false);

  // Export Seed
  const [exportPw, setExportPw] = useState('');
  const [revealed, setRevealed] = useState('');
  const [exporting, setExporting] = useState(false);

  // Change Password
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changing, setChanging] = useState(false);

  // Export DB
  const [exportingDb, setExportingDb] = useState(false);

  // Import DB
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importingDb, setImportingDb] = useState(false);

  const handleImport = async () => {
    if (!seed.trim() || !importPw || importPw.length < 3) {
      toast.error('Mnemonic and password (3+ chars) required');
      return;
    }
    setImporting(true);
    try {
      const r = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import-seed', mnemonic: seed.trim(), password: importPw }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Wallet imported: ${d.address.slice(0, 6)}...${d.address.slice(-4)}`);
        setSeed(''); setImportPw(''); onClose();
      } else {
        toast.error(d.error || 'Import failed');
      }
    } catch (e: any) {
      toast.error(e.message || 'Network error');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    if (!exportPw) { toast.error('Enter your password'); return; }
    setExporting(true);
    try {
      const r = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export-seed', password: exportPw }),
      });
      const d = await r.json();
      if (d.success) {
        setRevealed(d.mnemonic);
      } else {
        toast.error(d.error || 'Invalid password');
      }
    } catch (e: any) {
      toast.error(e.message || 'Network error');
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(revealed);
        toast.success('Seed copied!');
        return;
      }
    } catch {}
    // Fallback: legacy execCommand
    const ta = document.createElement('textarea');
    ta.value = revealed;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      toast.success('Seed copied!');
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
    document.body.removeChild(ta);
  };

  const handleExportDb = async () => {
    setExportingDb(true);
    try {
      const r = await fetch('/api/db');
      if (!r.ok) { toast.error('Export failed'); setExportingDb(false); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bitcoio-positions.db';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Database exported!');
    } catch (e: any) { toast.error(e.message || 'Export failed'); }
    finally { setExportingDb(false); }
  };

  const handleImportDb = async () => {
    if (!importFile) { toast.error('Select a .db file'); return; }
    setImportingDb(true);
    try {
      const fd = new FormData();
      fd.append('db', importFile);
      const r = await fetch('/api/db', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message || 'Database imported!');
        setImportFile(null);
        onClose();
      } else { toast.error(d.error || 'Import failed'); }
    } catch (e: any) { toast.error(e.message || 'Network error'); }
    finally { setImportingDb(false); }
  };

  const handleChangePassword = async () => {
    if (!oldPw) { toast.error('Enter current password'); return; }
    if (!newPw || newPw.length < 3) { toast.error('New password must be 3+ chars'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    setChanging(true);
    try {
      const r = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-password', oldPassword: oldPw, newPassword: newPw }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success('Password changed!');
        setOldPw(''); setNewPw(''); setConfirmPw('');
        try { localStorage.setItem('wallet_pw', newPw); } catch {}
        onClose();
      } else {
        toast.error(d.error || 'Change failed');
      }
    } catch (e: any) {
      toast.error(e.message || 'Network error');
    } finally {
      setChanging(false);
    }
  };

  const TABS = [
    { id: 'import' as const, label: 'Import' },
    { id: 'export' as const, label: 'Export' },
    { id: 'password' as const, label: 'Password' },
    { id: 'backup' as const, label: 'Backup' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="⚙️ Settings">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 mb-5 rounded-full bg-white/[0.03] border border-white/[0.05]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setRevealed(''); }}
            className={`flex-1 px-3 py-2 rounded-full text-xs font-medium transition-all ${
              tab === t.id ? 'bg-green-500/10 text-green-400' : 'text-white/30 hover:text-white/50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Import Seed */}
      {tab === 'import' && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <textarea value={seed} onChange={e => setSeed(e.target.value)}
            placeholder="Enter your 12 or 24 word seed phrase..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.1] text-sm text-white placeholder:text-white/15 outline-none focus:border-green-500/30 resize-none"
          />
          <input type="password" value={importPw} onChange={e => setImportPw(e.target.value)}
            placeholder="New password (3+ chars)"
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.1] text-sm text-white placeholder:text-white/15 outline-none focus:border-green-500/30"
          />
          <Button variant="primary" className="w-full" onClick={handleImport} loading={importing}>
            Import Wallet
          </Button>
        </motion.div>
      )}

      {/* Export Seed */}
      {tab === 'export' && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {!revealed ? (
            <>
              <p className="text-xs text-white/30 text-center">
                Enter your password to reveal your seed phrase
              </p>
              <input type="password" value={exportPw} onChange={e => setExportPw(e.target.value)}
                placeholder="Your password"
                onKeyDown={e => e.key === 'Enter' && handleExport()}
                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.1] text-sm text-white placeholder:text-white/15 outline-none focus:border-green-500/30"
              />
              <Button variant="primary" className="w-full" onClick={handleExport} loading={exporting}>
                Reveal Seed
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-green-500/[0.06] border border-green-500/15">
                <p className="text-[11px] text-green-400/60 mb-2 uppercase tracking-wider">Your Seed Phrase</p>
                <p className="text-sm text-white font-mono leading-relaxed break-words select-all">{revealed}</p>
              </div>
              <Button variant="primary" className="w-full" onClick={handleCopy}>
                📋 Copy to Clipboard
              </Button>
              <button
                onClick={() => { setRevealed(''); setExportPw(''); }}
                className="w-full text-xs text-white/20 hover:text-white/40 transition-colors py-1"
              >
                Hide
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* Backup — Export & Import DB */}
      {tab === 'backup' && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Export Section */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📥</span>
              <div>
                <p className="text-xs font-medium text-white/60">Export Database</p>
                <p className="text-[10px] text-white/20">Download positions.db</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleExportDb} loading={exportingDb}>
              Download positions.db
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.05]" />
            <span className="text-[10px] text-white/15">OR</span>
            <div className="flex-1 h-px bg-white/[0.05]" />
          </div>

          {/* Import Section */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📤</span>
              <div>
                <p className="text-xs font-medium text-white/60">Import Database</p>
                <p className="text-[10px] text-white/20">Restore from backup</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
              <p className="text-[10px] text-amber-400/50">
                ⚠️ Replaces current positions. Backup saved automatically.
              </p>
            </div>
            <label className="block w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.1] text-sm text-white/40 hover:border-green-500/30 transition-colors cursor-pointer text-center">
              {importFile ? importFile.name : 'Select .db file...'}
              <input type="file" accept=".db" onChange={e => setImportFile(e.target.files?.[0] || null)}
                className="hidden" />
            </label>
            <Button variant="primary" className="w-full" onClick={handleImportDb} loading={importingDb}
              disabled={!importFile}>
              Import Database
            </Button>
          </div>
        </motion.div>
      )}

      {/* Change Password */}
      {tab === 'password' && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
            placeholder="Current password"
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.1] text-sm text-white placeholder:text-white/15 outline-none focus:border-green-500/30"
          />
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
            placeholder="New password (3+ chars)"
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.1] text-sm text-white placeholder:text-white/15 outline-none focus:border-green-500/30"
          />
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.1] text-sm text-white placeholder:text-white/15 outline-none focus:border-green-500/30"
          />
          <Button variant="primary" className="w-full" onClick={handleChangePassword} loading={changing}>
            Change Password
          </Button>
        </motion.div>
      )}

      {/* Close button */}
      <div className="mt-5 pt-3 border-t border-white/[0.05]">
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  );
}
