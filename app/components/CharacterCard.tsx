'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/hooks/useAuth';
import type { Character } from '@/lib/types';
import { shortenAddress } from '@/lib/utils/solana';
import { getApiUrl } from '@/lib/utils/api';

interface CharacterCardProps {
  character: Character;
  onClose: () => void;
}

export function CharacterCard({ character, onClose }: CharacterCardProps) {
  const { user } = useAuth();
  const [isWatering, setIsWatering] = useState(false);
  const [loreText, setLoreText] = useState('');
  const [isSubmittingLore, setIsSubmittingLore] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'lore'>('info');

  const handleWater = async () => {
    if (!user || isWatering) return;

    setIsWatering(true);
    try {
      const response = await fetch(`/api/characters/${character.id}/water`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to water character');
      }

      await response.json();
      // Update will come through realtime
    } catch (error) {
      console.error('Water error:', error);
    } finally {
      setIsWatering(false);
    }
  };

  const handleSubmitLore = async () => {
    if (!user || !loreText.trim() || isSubmittingLore) return;

    // Check if user owns this character/creation
    const isOwner = character.owner_user_id === user.id;
    if (!isOwner) {
      alert('You can only add lore to your own creations');
      return;
    }

    setIsSubmittingLore(true);
    try {
      const response = await fetch(getApiUrl(`/api/lore/characters/${character.id}/lore`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: loreText }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit lore');
      }

      setLoreText('');
      alert('Lore added successfully!');
      // Refresh lore list
    } catch (error) {
      console.error('Lore submission error:', error);
      alert(error instanceof Error ? error.message : 'Failed to add lore');
    } finally {
      setIsSubmittingLore(false);
    }
  };

  const evolutionProgress = () => {
    const thresholds = [0, 3, 10, 25, 50];
    const currentThreshold = thresholds[character.level - 1];
    const nextThreshold = thresholds[character.level] || 50;
    const progress = ((character.water_count - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(progress, 100);
  };

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
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {character.name}
                {character.is_legendary && <span className="text-yellow-400">👑</span>}
              </h2>
              <p className="text-white/60 text-sm">
                Owned by {shortenAddress(character.wallet_address)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'info'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setActiveTab('lore')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'lore'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Lore
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' ? (
            <div className="space-y-4">
              {/* Character Stats */}
              <div className="bg-black/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">Level</span>
                  <span className="text-white font-bold">{character.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Waters</span>
                  <span className="text-white font-bold">{character.water_count}</span>
                </div>
                
                {/* Evolution Progress */}
                {character.level < 5 && (
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-white/60 text-sm">Evolution Progress</span>
                      <span className="text-white/60 text-sm">{Math.round(evolutionProgress())}%</span>
                    </div>
                    <div className="bg-black/50 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${evolutionProgress()}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Water Button */}
              {user && (
                <button
                  onClick={handleWater}
                  disabled={isWatering}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {isWatering ? 'Watering...' : '💧 Water Character'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Lore Submission - Only show for owner */}
              {user && character.owner_user_id === user.id ? (
                <div className="space-y-2">
                  <textarea
                    value={loreText}
                    onChange={(e) => setLoreText(e.target.value)}
                    placeholder="Write your lore for this character..."
                    className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/40 resize-none"
                    rows={4}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 text-sm">{loreText.length}/500</span>
                    <button
                      onClick={handleSubmitLore}
                      disabled={!loreText.trim() || isSubmittingLore}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                    >
                      {isSubmittingLore ? 'Submitting...' : 'Submit Lore'}
                    </button>
                  </div>
                </div>
              ) : user ? (
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <p className="text-white/60 text-sm">Only the owner can add lore to this creation</p>
                </div>
              ) : (
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <p className="text-white/60 text-sm">Login to add lore to your creations</p>
                </div>
              )}

              {/* Existing Lore */}
              <div className="bg-black/30 rounded-lg p-4 max-h-60 overflow-y-auto">
                <p className="text-white/60 text-center">No lore yet. Be the first to write!</p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}