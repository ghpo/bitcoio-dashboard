import { NextRequest, NextResponse } from 'next/server';
import { unlock, lockWallet, isUnlocked, getUnlockedAddress, importSeed, changePassword, exportSeed } from '@/lib/wallet-server';

// POST: unlock or lock
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'unlock') {
      const { password } = body;
      if (!password || typeof password !== 'string') {
        return NextResponse.json({ error: 'Password required' }, { status: 400 });
      }
      const result = await unlock(password);
      return NextResponse.json({
        success: true,
        address: result.address,
        btcAddress: result.btcAddress,
        taprootAddress: result.taprootAddress,
        walletId: result.walletId,
      });
    }

    if (action === 'lock') {
      lockWallet();
      return NextResponse.json({ success: true, message: 'Wallet locked' });
    }

    if (action === 'import-seed') {
      const { mnemonic, password } = body;
      if (!mnemonic || typeof mnemonic !== 'string') {
        return NextResponse.json({ error: 'Mnemonic (seed phrase) required' }, { status: 400 });
      }
      if (!password || typeof password !== 'string' || password.length < 3) {
        return NextResponse.json({ error: 'Password must be at least 3 characters' }, { status: 400 });
      }
      const result = await importSeed(mnemonic.trim(), password);
      return NextResponse.json({
        success: true,
        address: result.address,
        walletId: result.walletId,
      });
    }

    if (action === 'change-password') {
      const { oldPassword, newPassword } = body;
      if (!oldPassword || !newPassword || typeof newPassword !== 'string' || newPassword.length < 3) {
        return NextResponse.json({ error: 'New password must be at least 3 characters' }, { status: 400 });
      }
      await changePassword(oldPassword, newPassword);
      return NextResponse.json({ success: true, message: 'Password changed' });
    }

    if (action === 'export-seed') {
      const { password } = body;
      if (!password) {
        return NextResponse.json({ error: 'Password required' }, { status: 400 });
      }
      const mnemonic = await exportSeed(password);
      return NextResponse.json({ success: true, mnemonic });
    }

    return NextResponse.json({ error: 'Invalid action. Use "unlock", "lock", "import-seed", "change-password", or "export-seed".' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 401 });
  }
}

// GET: wallet status
export async function GET() {
  const unlocked = isUnlocked();
  const address = getUnlockedAddress();
  let btcAddress: string | undefined;
  let taprootAddress: string | undefined;

  if (unlocked && address) {
    try {
      const { readFileSync, existsSync } = await import('fs');
      const { resolve: r } = await import('path');
      const idxFile = r(require('os').homedir(), '.aibtc', 'wallets.json');
      if (existsSync(idxFile)) {
        const idx = JSON.parse(readFileSync(idxFile, 'utf8'));
        const meta = idx.wallets?.find((w: any) => w.address === address);
        btcAddress = meta?.btcAddress;
        taprootAddress = meta?.taprootAddress;
      }
    } catch {}
  }

  return NextResponse.json({
    unlocked,
    address,
    btcAddress: btcAddress || null,
    taprootAddress: taprootAddress || null,
  });
}
