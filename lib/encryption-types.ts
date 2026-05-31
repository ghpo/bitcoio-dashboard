export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
  scryptParams: {
    N: number;
    r: number;
    p: number;
    keyLen: number;
  };
  version: number;
}
