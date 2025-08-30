'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/hooks/useAuth';

export function WalletConnectButton() {
  const { publicKey, signMessage, connected } = useWallet();
  const { user, verifyWallet } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (connected && publicKey && user && !user.wallet_verified) {
      handleVerifyWallet();
    }
  }, [connected, publicKey, user]);

  const handleVerifyWallet = async () => {
    if (!publicKey || !signMessage || isVerifying) return;

    setIsVerifying(true);
    try {
      const message = `Verify wallet ownership for Droplets of Creation\nAddress: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      
      await verifyWallet({
        signed_message: message,
        signature: Buffer.from(signature).toString('base64'),
      });
    } catch (error) {
      console.error('Failed to verify wallet:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 !transition-all" />
      {connected && publicKey && user && !user.wallet_verified && (
        <button
          onClick={handleVerifyWallet}
          disabled={isVerifying}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isVerifying ? 'Verifying...' : 'Verify Wallet'}
        </button>
      )}
    </div>
  );
}