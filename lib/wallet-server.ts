/**
 * Server-side wallet management.
 * Decrypts the keystore with password, derives STX private key,
 * keeps it in memory, and writes a session file for cross-process use.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import type { EncryptedData } from './encryption-types.js';

// Re-use the same AES-256-GCM + Scrypt encryption as the wallet-manager
// but implemented inline to avoid importing bun-specific modules.

const STORAGE_DIR = resolve(homedir(), '.aibtc');
const WALLET_INDEX_FILE = resolve(STORAGE_DIR, 'wallets.json');
const CONFIG_FILE = resolve(STORAGE_DIR, 'config.json');

interface WalletMetadata {
  id: string;
  name: string;
  address: string;
  btcAddress?: string;
  taprootAddress?: string;
  network: string;
}

interface WalletIndex {
  version: number;
  wallets: WalletMetadata[];
}

interface AppConfig {
  activeWalletId: string | null;
}

// ── In-memory state ──

let stxPrivateKey: string | null = null;
let unlockedAddress: string | null = null;
let unlockedWalletId: string | null = null;

export function getStxPrivateKey(): string | null {
  return stxPrivateKey;
}

export function getUnlockedAddress(): string | null {
  return unlockedAddress;
}

export function getUnlockedWalletId(): string | null {
  return unlockedWalletId;
}

export function isUnlocked(): boolean {
  return stxPrivateKey !== null;
}

export function lockWallet() {
  stxPrivateKey = null;
  unlockedAddress = null;
  unlockedWalletId = null;
}

// ── Helpers ──

function readJsonFile<T>(filepath: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(filepath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function getActiveWalletId(): string | null {
  const config = readJsonFile<AppConfig>(CONFIG_FILE, { activeWalletId: null });
  if (config.activeWalletId) return config.activeWalletId;

  // Fallback: find mainnet wallet with most recent lastUsed
  const index = readJsonFile<WalletIndex>(WALLET_INDEX_FILE, { version: 1, wallets: [] });
  const mainnet = index.wallets
    .filter(w => w.network === 'mainnet')
    .sort((a, b) => ((b as any).lastUsed || '').localeCompare((a as any).lastUsed || ''));
  return mainnet[0]?.id ?? null;
}

function getKeystorePath(walletId: string): string {
  return resolve(STORAGE_DIR, 'wallets', walletId, 'keystore.json');
}

interface KeystoreFile {
  version: number;
  encrypted: EncryptedData;
  addressIndex: number;
}

function readKeystore(walletId: string): KeystoreFile {
  return JSON.parse(readFileSync(getKeystorePath(walletId), 'utf8')) as KeystoreFile;
}

// ── AES-256-GCM Decryption ──

import crypto from 'node:crypto';

async function deriveKey(password: string, salt: Buffer, params: EncryptedData['scryptParams']): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, params.keyLen, { N: params.N, r: params.r, p: params.p }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

async function decryptMnemonic(encrypted: EncryptedData, password: string): Promise<string> {
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const salt = Buffer.from(encrypted.salt, 'base64');

  const key = await deriveKey(password, salt, encrypted.scryptParams);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

// ── Unlock ──

export async function unlock(password: string): Promise<{
  address: string;
  btcAddress?: string;
  taprootAddress?: string;
  walletId: string;
}> {
  const walletId = getActiveWalletId();
  if (!walletId) throw new Error('No wallet found. Create a wallet first.');

  const keystore = readKeystore(walletId);

  let mnemonic: string;
  try {
    mnemonic = await decryptMnemonic(keystore.encrypted, password);
  } catch {
    throw new Error('Invalid password');
  }

  // Derive STX keys using @stacks/wallet-sdk
  const { generateWallet, getStxAddress } = await import('@stacks/wallet-sdk');
  const wallet = await generateWallet({ secretKey: mnemonic, password: '' });
  const account = wallet.accounts[0];

  stxPrivateKey = account.stxPrivateKey;
  const address = getStxAddress(account, 'mainnet');
  unlockedAddress = address;
  unlockedWalletId = walletId;

  // Read wallet metadata for BTC addresses
  const index = readJsonFile<WalletIndex>(WALLET_INDEX_FILE, { version: 1, wallets: [] });
  const meta = index.wallets.find((w: any) => w.id === walletId);

  // Write session file for cross-process compatibility (bitflow-swap-aggregator)
  await writeSessionForWalletManager(walletId, account, mnemonic, meta);

  return {
    address,
    btcAddress: meta?.btcAddress,
    taprootAddress: meta?.taprootAddress,
    walletId,
  };
}

// Write session file compatible with wallet-manager's session format
async function writeSessionForWalletManager(
  walletId: string,
  account: any,
  _mnemonic: string,
  meta: any
) {
  try {
    const { writeFileSync, mkdirSync, existsSync } = await import('fs');
    const sessionsDir = resolve(STORAGE_DIR, 'sessions');
    if (!existsSync(sessionsDir)) mkdirSync(sessionsDir, { recursive: true, mode: 0o700 });

    // We use a simple JSON session file that the bitflow-swap-aggregator can read
    // Format: { stxPrivateKey, address, network }
    const sessionPath = resolve(sessionsDir, `${walletId}.json`);
    const sessionData = {
      stxPrivateKey: account.stxPrivateKey,
      address: unlockedAddress,
      network: 'mainnet',
      unlockedAt: new Date().toISOString(),
    };
    writeFileSync(sessionPath, JSON.stringify(sessionData), { mode: 0o600 });
  } catch {
    // Non-critical — session file is a best-effort optimization
    console.warn('Could not write session file for wallet-manager compatibility');
  }
}

// ── AES-256-GCM Encryption ──

async function encryptMnemonic(mnemonic: string, password: string): Promise<EncryptedData> {
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const scryptParams = { N: 16384, r: 8, p: 1, keyLen: 32 };

  const key = await deriveKey(password, salt, scryptParams);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(mnemonic, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64'),
    scryptParams,
    version: 1,
  };
}

// ── Import Seed / Change Password ──

export async function importSeed(mnemonic: string, password: string): Promise<{ address: string; walletId: string }> {
  const { generateWallet, getStxAddress } = await import('@stacks/wallet-sdk');
  const wallet = await generateWallet({ secretKey: mnemonic, password: '' });
  const account = wallet.accounts[0];
  const address = getStxAddress(account, 'mainnet');

  // Generate wallet ID
  const walletId = 'wallet_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

  // Encrypt and save keystore
  const encrypted = await encryptMnemonic(mnemonic, password);
  const keystoreDir = resolve(STORAGE_DIR, 'wallets', walletId);
  const { mkdirSync } = await import('fs');
  if (!existsSync(keystoreDir)) mkdirSync(keystoreDir, { recursive: true, mode: 0o700 });

  const keystore: KeystoreFile = { version: 1, encrypted, addressIndex: 0 };
  const { writeFileSync } = await import('fs');
  writeFileSync(resolve(keystoreDir, 'keystore.json'), JSON.stringify(keystore, null, 2), { mode: 0o600 });

  // Update wallet index
  await updateWalletIndex(walletId, address);

  // Update config to set as active
  const config = readJsonFile<AppConfig>(CONFIG_FILE, { activeWalletId: null });
  config.activeWalletId = walletId;
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });

  return { address, walletId };
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const walletId = getActiveWalletId();
  if (!walletId) throw new Error('No wallet found');

  const keystore = readKeystore(walletId);
  let mnemonic: string;
  try {
    mnemonic = await decryptMnemonic(keystore.encrypted, oldPassword);
  } catch {
    throw new Error('Current password is incorrect');
  }

  // Re-encrypt with new password
  const encrypted = await encryptMnemonic(mnemonic, newPassword);
  const updatedKeystore: KeystoreFile = { ...keystore, encrypted };
  const { writeFileSync } = await import('fs');
  writeFileSync(getKeystorePath(walletId), JSON.stringify(updatedKeystore, null, 2), { mode: 0o600 });

  return true;
}

async function updateWalletIndex(walletId: string, address: string) {
  const index = readJsonFile<WalletIndex>(WALLET_INDEX_FILE, { version: 1, wallets: [] });
  index.wallets.push({
    id: walletId,
    name: 'Imported Wallet',
    address,
    network: 'mainnet',
  });
  const { writeFileSync } = await import('fs');
  writeFileSync(WALLET_INDEX_FILE, JSON.stringify(index, null, 2), { mode: 0o600 });
}

// ── Export Seed ──

export async function exportSeed(password: string): Promise<string> {
  const walletId = getActiveWalletId();
  if (!walletId) throw new Error('No wallet found');

  const keystore = readKeystore(walletId);
  return await decryptMnemonic(keystore.encrypted, password);
}
