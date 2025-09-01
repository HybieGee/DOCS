'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/hooks/useAuth';
import type { Character } from '@/lib/types';
import { shortenAddress } from '@/lib/utils/solana';
import { getApiUrl } from '@/lib/utils/api';

interface CharacterCardProps {
  character: Character;
  onClose: () => void;
  onRefresh?: () => void;
}

export function CharacterCard({ character, onClose, onRefresh }: CharacterCardProps) {
  const { user } = useAuth();
  
  // Local character state to handle updates
  const [currentCharacter, setCurrentCharacter] = useState<Character>(character);
  
  // Debug logging
  console.log('CharacterCard opened:', {
    character: currentCharacter.name,
    characterId: currentCharacter.id,
    user: user?.username || 'Not logged in',
    userLoggedIn: !!user
  });
  const [isWatering, setIsWatering] = useState(false);
  const [loreText, setLoreText] = useState('');
  const [isSubmittingLore, setIsSubmittingLore] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'lore'>('info');
  const [existingLore, setExistingLore] = useState<Array<{id: string; body: string; author_user_id: string; created_at: string; likes_count: number; user_liked: number}>>([]);
  const [loadingLore, setLoadingLore] = useState(false);

  // Fetch existing lore when component mounts or when lore tab is selected
  useEffect(() => {
    const fetchLore = async () => {
      setLoadingLore(true);
      try {
        console.log(`Fetching lore for character: ${currentCharacter.id}`);
        const url = getApiUrl(`/api/lore/characters/${currentCharacter.id}/lore`);
        console.log(`Lore API URL: ${url}`);
        
        const response = await fetch(url, {
          credentials: 'include',
        });

        console.log(`Lore API response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Lore API response data:`, data);
          setExistingLore(data.data || []);
        } else {
          console.error('Failed to fetch lore, status:', response.status);
          const errorText = await response.text();
          console.error('Lore error response:', errorText);
          setExistingLore([]);
        }
      } catch (error) {
        console.error('Error fetching lore:', error);
        setExistingLore([]);
      } finally {
        setLoadingLore(false);
      }
    };

    if (activeTab === 'lore') {
      fetchLore();
    }
  }, [activeTab, currentCharacter.id]);

  // Debug existing lore changes
  useEffect(() => {
    console.log('ExistingLore state changed:', existingLore, 'Length:', existingLore.length);
  }, [existingLore]);

  const handleLikeLore = async (loreId: string, currentlyLiked: boolean) => {
    if (!user) return;

    try {
      const method = currentlyLiked ? 'DELETE' : 'POST';
      const response = await fetch(getApiUrl(`/api/lore/${loreId}/like`), {
        method,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Update the lore in our state
        setExistingLore(prev => prev.map(lore => 
          lore.id === loreId 
            ? { ...lore, likes_count: data.data.likes_count, user_liked: data.data.liked ? 1 : 0 }
            : lore
        ));
      } else {
        const error = await response.json();
        console.error('Like error:', error.error);
      }
    } catch (error) {
      console.error('Error liking lore:', error);
    }
  };

  const handleWater = async () => {
    if (!user || isWatering) return;

    setIsWatering(true);
    try {
      const response = await fetch(getApiUrl(`/api/characters/${currentCharacter.id}/water`), {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to water character');
      }

      const result = await response.json();
      
      if (result.success) {
        // Show success message
        console.log('Successfully watered character!', result.data);
        
        // Update local character state immediately for instant feedback
        setCurrentCharacter(prev => ({
          ...prev,
          water_count: result.data.water_count,
          level: result.data.level
        }));
        
        // Trigger immediate refresh of world state and characters
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error('Water error:', error);
      alert(error instanceof Error ? error.message : 'Failed to water character');
    } finally {
      setIsWatering(false);
    }
  };

  const handleSubmitLore = async () => {
    if (!user || !loreText.trim() || isSubmittingLore) return;

    // Check if user owns this character/creation
    const isOwner = currentCharacter.owner_user_id === user.id;
    if (!isOwner) {
      alert('You can only add lore to your own creations');
      return;
    }

    setIsSubmittingLore(true);
    try {
      const response = await fetch(getApiUrl(`/api/lore/characters/${currentCharacter.id}/lore`), {
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
      // Refresh lore list by refetching
      if (activeTab === 'lore') {
        const fetchLore = async () => {
          setLoadingLore(true);
          try {
            const response = await fetch(getApiUrl(`/api/lore/characters/${currentCharacter.id}/lore`), {
              credentials: 'include',
            });

            if (response.ok) {
              const data = await response.json();
              setExistingLore(data.data || []);
            } else {
              console.error('Failed to fetch lore');
              setExistingLore([]);
            }
          } catch (error) {
            console.error('Error fetching lore:', error);
            setExistingLore([]);
          } finally {
            setLoadingLore(false);
          }
        };
        await fetchLore();
      }
    } catch (error) {
      console.error('Lore submission error:', error);
      alert(error instanceof Error ? error.message : 'Failed to add lore');
    } finally {
      setIsSubmittingLore(false);
    }
  };

  const evolutionProgress = () => {
    const thresholds = [0, 3, 10, 25, 50];
    const currentThreshold = thresholds[currentCharacter.level - 1];
    const nextThreshold = thresholds[currentCharacter.level] || 50;
    const progress = ((currentCharacter.water_count - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(progress, 100);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {currentCharacter.name}
                {currentCharacter.is_legendary && <span className="text-yellow-400">👑</span>}
              </h2>
              <p className="text-white/60 text-sm">
                Owned by {shortenAddress(currentCharacter.wallet_address)}
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
                  <span className="text-white font-bold">{currentCharacter.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Waters</span>
                  <span className="text-white font-bold">{currentCharacter.water_count}</span>
                </div>
                
                {/* Evolution Progress */}
                {currentCharacter.level < 5 && (
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
              {user ? (
                <button
                  onClick={handleWater}
                  disabled={isWatering}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {isWatering ? 'Watering...' : '💧 Water Character'}
                </button>
              ) : (
                <div className="w-full py-3 bg-gray-600 text-white text-center rounded-lg">
                  Login to water this character
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Lore Submission - Only show for owner */}
              {user && currentCharacter.owner_user_id === user.id && (
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
              )}

              {/* Existing Lore */}
              <div className="bg-black/30 rounded-lg p-4 max-h-60 overflow-y-auto">
                {loadingLore ? (
                  <p className="text-white/60 text-center">Loading lore...</p>
                ) : existingLore.length > 0 ? (
                  <div className="space-y-3">
                    {existingLore.map((lore) => {
                      console.log('Rendering lore item:', lore);
                      return (
                      <div key={lore.id} className="border-b border-white/10 pb-3 last:border-b-0">
                        <p className="text-white text-sm mb-2">{lore.body}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-white/40 text-xs">
                            {new Date(lore.created_at).toLocaleDateString()}
                          </p>
                          {user && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleLikeLore(lore.id, Boolean(lore.user_liked))}
                                className={`flex items-center gap-1 text-xs transition-colors ${
                                  lore.user_liked 
                                    ? 'text-red-400 hover:text-red-300' 
                                    : 'text-white/60 hover:text-red-400'
                                }`}
                              >
                                <span className="text-sm">{lore.user_liked ? '❤️' : '🤍'}</span>
                                <span>{lore.likes_count}</span>
                              </button>
                            </div>
                          )}
                          {!user && lore.likes_count > 0 && (
                            <div className="flex items-center gap-1 text-white/40 text-xs">
                              <span className="text-sm">❤️</span>
                              <span>{lore.likes_count}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-white/60 text-center">No lore yet. Be the first to write!</p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}