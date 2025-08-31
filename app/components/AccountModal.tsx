'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/hooks/useAuth';
import { getApiUrl } from '@/lib/utils/api';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password change form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
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
            <h2 className="text-2xl font-bold text-white">Account Settings</h2>
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
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                activeTab === 'info'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Account Info
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                activeTab === 'password'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Change Password
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-6">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Content */}
          {activeTab === 'info' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm font-medium mb-1">
                  Username
                </label>
                <div className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg">
                  <p className="text-white font-medium">{user.username}</p>
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm font-medium mb-1">
                  User ID
                </label>
                <div className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg">
                  <p className="text-white/80 font-mono text-sm">{user.id}</p>
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm font-medium mb-1">
                  Solana Address
                </label>
                <div className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg">
                  <p className="text-white/80 font-mono text-xs break-all">
                    {user.solana_address || 'Not connected'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-sm font-medium mb-1">
                  Account Created
                </label>
                <div className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg">
                  <p className="text-white/80">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 font-medium rounded-lg transition-all border border-red-600/30"
              >
                Logout
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}