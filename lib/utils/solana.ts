import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export async function verifySignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const publicKey = new PublicKey(address);
    const messageBytes = new TextEncoder().encode(message);
    
    // Decode signature from base64
    const signatureBytes = Buffer.from(signature, 'base64');
    
    // Verify the signature
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
    
    return verified;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}