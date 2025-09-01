'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/hooks/useAuth';
import { getApiUrl } from '@/lib/utils/api';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'mint'>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nextMintTime, setNextMintTime] = useState<Date | null>(null);
  const [timeUntilMint, setTimeUntilMint] = useState<string>('');

  // Password change form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Calculate next mint time (midnight UTC)
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    setNextMintTime(tomorrow);
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!nextMintTime) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = nextMintTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeUntilMint('Ready to mint!');
        // Reset to next day
        const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
        setNextMintTime(tomorrow);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeUntilMint(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextMintTime]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl('/api/auth/change-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      setError((error as Error).message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  if (!isOpen || !user) return null;

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
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Welcome Back</h2>
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
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 px-4 transition-all text-sm font-semibold uppercase tracking-wider ${
                activeTab === 'info'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-3 px-4 transition-all text-sm font-semibold uppercase tracking-wider ${
                activeTab === 'password'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setActiveTab('mint')}
              className={`flex-1 py-3 px-4 transition-all text-sm font-semibold uppercase tracking-wider ${
                activeTab === 'mint'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Mint Timer
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="border-2 border-red-500 bg-black p-3 mb-6">
              <p className="text-red-500 text-sm uppercase">{error}</p>
            </div>
          )}
          {success && (
            <div className="border-2 border-green-500 bg-black p-3 mb-6">
              <p className="text-green-500 text-sm uppercase">{success}</p>
            </div>
          )}

          {/* Content */}
          {activeTab === 'info' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="px-4 py-3 bg-black border-2 border-white">
                  <p className="text-white font-mono">{user.username}</p>
                </div>
              </div>

              <div>
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">
                  User ID
                </label>
                <div className="px-4 py-3 bg-black border-2 border-white">
                  <p className="text-white/80 font-mono text-xs">{user.id}</p>
                </div>
              </div>

              <div>
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">
                  Solana Address
                </label>
                <div className="px-4 py-3 bg-black border-2 border-white">
                  <p className="text-white/80 font-mono text-xs break-all">
                    {user.solana_address || 'Not connected'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">
                  Account Created
                </label>
                <div className="px-4 py-3 bg-black border-2 border-white">
                  <p className="text-white/80 font-mono text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-3 bg-black text-white font-bold uppercase tracking-wider transition-all border-2 border-white hover:bg-white hover:text-black"
              >
                Logout
              </button>
            </div>
          ) : activeTab === 'password' ? (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-white/40 focus:outline-none focus:border-white transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-white/40 focus:outline-none focus:border-white transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-white/40 focus:outline-none focus:border-white transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-black text-white font-bold uppercase tracking-wider transition-all border-2 border-white hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <label className="block text-white text-xs font-bold uppercase tracking-wider mb-4">
                  Next Droplet Available In
                </label>
                <div className="px-6 py-8 bg-black border-2 border-white">
                  <p className="text-white font-mono text-4xl font-bold">
                    {timeUntilMint || '00:00:00'}
                  </p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-white/60 text-xs uppercase tracking-wider mb-2">
                  Mint resets daily at midnight UTC
                </p>
                <p className="text-white text-sm font-mono">
                  {nextMintTime ? nextMintTime.toUTCString().replace('GMT', 'UTC') : ''}
                </p>
              </div>

              <div className="border-t-2 border-white pt-4">
                <p className="text-white/80 text-xs text-center">
                  💧 One droplet per day per account
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}