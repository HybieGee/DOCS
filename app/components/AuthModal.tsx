'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/hooks/useAuth';
import { useWallet } from '@solana/wallet-adapter-react';
import type { SignupRequest, LoginRequest } from '@/lib/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, signup } = useAuth();
  const { publicKey, signMessage } = useWallet();

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !signMessage) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'signup') {
        // Create signature for signup
        const message = `Sign up for Droplets of Creation\nUsername: ${username}\nAddress: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
        const encodedMessage = new TextEncoder().encode(message);
        const signature = await signMessage(encodedMessage);

        const signupData: SignupRequest = {
          username,
          password,
          solana_address: publicKey.toBase58(),
          signed_message: message,
          signature: Buffer.from(signature).toString('base64'),
          turnstile_token: 'dummy', // Replace with real Turnstile token
        };

        await signup(signupData);
      } else {
        const loginData: LoginRequest = {
          username,
          password,
        };

        await login(loginData);
      }

      onClose();
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 max-w-md w-full border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {activeTab === 'login' ? 'Welcome Back' : 'Join the World'}
            </h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors text-xl"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter your username"
                required
                minLength={3}
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            {activeTab === 'signup' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-blue-400 text-xs">
                  💡 Your wallet signature proves ownership of your Solana address
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !publicKey}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Please wait...'
                : !publicKey
                ? 'Connect wallet first'
                : activeTab === 'login'
                ? 'Login'
                : 'Create Account'
              }
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              {activeTab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setActiveTab(activeTab === 'login' ? 'signup' : 'login')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {activeTab === 'login' ? 'Sign up' : 'Login'}
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}