'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/hooks/useAuth';
import { isValidSolanaAddress } from '@/lib/utils/solana';

interface SimpleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

export function SimpleAuthModal({ isOpen, onClose, defaultTab = 'login' }: SimpleAuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, signup } = useAuth();

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [solanaAddress, setSolanaAddress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'signup') {
        // Validate Solana address format
        if (!isValidSolanaAddress(solanaAddress)) {
          setError('Invalid Solana address format');
          return;
        }

        // For simplified signup, we'll create a mock signature
        const message = `Sign up for Droplets of Creation\nUsername: ${username}\nAddress: ${solanaAddress}\nTimestamp: ${Date.now()}`;
        const mockSignature = 'simplified_signup_no_wallet_required';

        await signup({
          username,
          password,
          solana_address: solanaAddress,
          signed_message: message,
          signature: mockSignature,
          turnstile_token: 'dummy', // Replace with real Turnstile token
        });
      } else {
        await login({ username, password });
      }

      onClose();
      // Reset form
      setUsername('');
      setPassword('');
      setSolanaAddress('');
    } catch (error: unknown) {
      setError((error as Error).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          // Only close if it's a clean click (not a drag/text selection)
          if (e.target === e.currentTarget && !window.getSelection()?.toString()) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-black border-2 border-white p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-white">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">
              Welcome Back
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-white/70 transition-colors text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 border-b-2 border-white">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 px-4 transition-all text-sm font-semibold uppercase tracking-wider ${
                activeTab === 'login'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-3 px-4 transition-all text-sm font-semibold uppercase tracking-wider ${
                activeTab === 'signup'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="border-2 border-red-500 bg-black p-3 mb-6">
              <p className="text-red-500 text-sm uppercase">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-white/40 focus:outline-none focus:border-white transition-colors"
                placeholder="Test"
                required
                minLength={3}
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-white/40 focus:outline-none focus:border-white transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {activeTab === 'signup' && (
              <div>
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">
                  Solana Address
                </label>
                <input
                  type="text"
                  value={solanaAddress}
                  onChange={(e) => setSolanaAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-white/40 focus:outline-none focus:border-white transition-colors font-mono text-sm"
                  placeholder="Your Solana wallet address"
                  required
                />
                <p className="text-white/60 text-xs mt-2">
                  Must be a valid Solana wallet address (32-44 characters)
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white font-bold uppercase tracking-wider transition-all border-2 border-white hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Please wait...'
                : activeTab === 'login'
                ? 'Login'
                : 'Sign Up'
              }
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t-2 border-white text-center">
            <p className="text-white/60 text-sm">
              {activeTab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setActiveTab(activeTab === 'login' ? 'signup' : 'login')}
                className="text-white underline hover:text-white/80 transition-colors"
              >
                {activeTab === 'login' ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}