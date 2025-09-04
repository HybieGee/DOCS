'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorldCanvas } from './components/WorldCanvas';
import { CharacterCard } from './components/CharacterCard';
import { SimpleAuthModal } from './components/SimpleAuthModal';
import { AccountModal } from './components/AccountModal';
import { CreationsModal } from './components/CreationsModal';
import { useAuth } from './hooks/useAuth';
import { useWorldStream } from './hooks/useWorldStream';
import type { Character } from '@/lib/types';
import { getApiUrl } from '@/lib/utils/api';

export default function Home() {
  const { user, logout } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [worldState, setWorldState] = useState({
    total_characters: 0,
    total_waters: 0,
    season: 'spring',
    current_phase: 'day',
  });
  const [isMinting, setIsMinting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [canCreateToday, setCanCreateToday] = useState(true);
  const [showCreationsModal, setShowCreationsModal] = useState(false);
  const [pendingCharacter, setPendingCharacter] = useState<Character | null>(null);

  const fetchWorldState = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/world/state'));
      const data = await response.json();
      if (data.success) {
        setWorldState(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch world state:', error);
    }
  }, []);

  const fetchCharacters = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/characters'));
      const data = await response.json();
      if (data.success) {
        setCharacters(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    }
  }, []);

  // Auto-refresh data every 30 seconds to prevent scrollbar bug
  useEffect(() => {
    const interval = setInterval(async () => {
      fetchWorldState();
      fetchCharacters();
      
      // Auto-earn tokens for logged in users
      if (user) {
        try {
          await fetch(getApiUrl('/api/tokens/auto-earn'), { 
            method: 'POST',
            credentials: 'include' 
          });
        } catch (error) {
          // Silent fail for auto-earning - don't disturb gameplay
          console.error('Auto-earn failed:', error);
        }
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchWorldState, fetchCharacters, user]);

  // Refresh function to call after actions
  const handleRefresh = useCallback(async () => {
    await fetchWorldState();
    await fetchCharacters();
  }, [fetchWorldState, fetchCharacters]);

  // Handle real-time events from SSE stream
  const handleWorldEvent = useCallback((type: string, data: unknown) => {
    console.log('World event received:', type, data);
    
    switch (type) {
      case 'spawn':
        // Add new character with pending animation
        const newCharacter = data as Character;
        setPendingCharacter(newCharacter);
        setTimeout(() => {
          setCharacters((prev) => [newCharacter, ...prev]);
          setPendingCharacter(null);
        }, 1500);
        break;
        
      case 'water':
      case 'levelUp':
        // Update character state
        const updateData = data as { dropletId: string; waterCount: number; level: number };
        setCharacters((prev) =>
          prev.map((char) =>
            char.id === updateData.dropletId
              ? { ...char, water_count: updateData.waterCount, level: updateData.level }
              : char
          )
        );
        
        // Also update world state totals
        if (type === 'water') {
          setWorldState(prev => ({
            ...prev,
            total_waters: prev.total_waters + 1
          }));
        }
        break;
    }
  }, []);

  // Connect to SSE stream for real-time updates
  useWorldStream(handleWorldEvent);

  useEffect(() => {
    fetchWorldState();
    fetchCharacters();
  }, [fetchWorldState, fetchCharacters]);

  const checkCanCreateToday = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(getApiUrl('/api/creations/can-create'), {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setCanCreateToday(data.data.can_create);
      }
    } catch (error) {
      console.error('Failed to check creation status:', error);
    }
  }, [user]);

  // Check creation status when user changes
  useEffect(() => {
    checkCanCreateToday();
  }, [checkCanCreateToday]);


  const handleMint = async () => {
    if (!user || isMinting) return;

    setIsMinting(true);
    try {
      // Call the new creation API
      const response = await fetch(getApiUrl('/api/creations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          wallet: user.solana_address,
          level: 1 // Start with level 1
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create character');
      }

      const result = await response.json();
      console.log('Creation success:', result);
      
      if (result.success && result.data) {
        // Create a character-like object to add to the display
        const creationAsCharacter = {
          id: result.data.id,
          owner_user_id: user.id,
          wallet_address: user.solana_address,
          name: `Creation ${result.data.id.slice(-4)}`, // Use last 4 chars of ID
          is_legendary: result.data.traits.level === 3,
          x: Math.random() * 1200, // Random position
          y: Math.random() * 200 + 400, // Random Y in lower area
          level: result.data.level,
          water_count: 0,
          sprite_seed: result.data.seed,
          color_palette: JSON.stringify({
            primary: result.data.traits.level >= 3 ? '#FFD700' : '#FFFFFF',
            secondary: result.data.traits.level >= 2 ? '#CCCCCC' : '#999999',
            accent: '#FFFFFF',
            hasColor: result.data.traits.level >= 2
          }),
          created_at: result.data.created_at,
          updated_at: result.data.created_at,
          image_url: result.data.image_url
        };
        
        // First, show a pending animation
        setPendingCharacter(creationAsCharacter);
        
        // Add to characters display with a delay for smooth animation
        setTimeout(() => {
          setCharacters(prev => [creationAsCharacter, ...prev]);
          setPendingCharacter(null);
        }, 1500); // 1.5 second animation delay
        
        // Show creation details in console for debugging
        console.log('Created droplet:', result.data.traits);
      }
      
      // Refresh world state and characters immediately
      await fetchWorldState();
      await fetchCharacters();
      
      // Update creation status
      await checkCanCreateToday();
      
    } catch (error) {
      console.error('Creation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to create character');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Background Video */}
      <video
        className="video-background"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/Background.mp4" type="video/mp4" />
      </video>
      
      {/* Full Screen World View */}
      <div className="full-screen-world">
        <WorldCanvas
          characters={characters}
          worldState={worldState}
          onCharacterClick={setSelectedCharacter}
          pendingCharacter={pendingCharacter}
        />
      </div>

      {/* Top UI Bar */}
      <div className="top-ui-bar">
        {/* Top Left - Login/Account */}
        <div className="top-left-buttons">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-white/90 text-sm">Welcome, <strong>{user.username}</strong></span>
              <button
                onClick={() => setShowAccountModal(true)}
                className="minimal-button text-xs"
              >
                Account
              </button>
              <button
                onClick={() => logout()}
                className="minimal-button text-xs"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="minimal-button"
            >
              Login / Sign Up
            </button>
          )}
        </div>

        {/* Top Center - Mint Button */}
        <div className="top-center-button">
          {user ? (
            <>
              {canCreateToday ? (
                <button
                  onClick={handleMint}
                  disabled={isMinting}
                  className="minimal-button px-6 py-3 text-base font-medium"
                >
                  {isMinting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 loading-spinner" />
                      <span>Minting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>💧</span>
                      <span>Mint Today&apos;s Droplet</span>
                    </div>
                  )}
                </button>
              ) : (
                <div className="text-white/60 text-sm text-center">
                  <div>✅ Today&apos;s droplet created!</div>
                  <div className="text-xs text-white/40 mt-1">Come back tomorrow for another</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-white/50 text-sm">Login to mint</div>
          )}
        </div>

        {/* Top Right - Navigation buttons */}
        <div className="top-right-buttons">
          {user && (
            <>
              <button 
                className="minimal-button text-xs"
                onClick={() => setShowCreationsModal(true)}
              >
                Creations
              </button>
              <button 
                className="minimal-button text-xs"
                onClick={() => window.location.href = '/quests'}
              >
                Quests
              </button>
              <button 
                className="minimal-button text-xs"
                onClick={() => window.location.href = '/tokens'}
              >
                Tokens
              </button>
            </>
          )}
          <button 
            className="minimal-button text-xs"
            onClick={() => window.location.href = '/how-it-works'}
          >
            How it works
          </button>
          <button 
            className="minimal-button text-xs"
            onClick={() => window.location.href = '/info'}
          >
            Info
          </button>
          <button 
            className="minimal-button text-xs"
            onClick={() => window.location.href = '/vote'}
          >
            Vote
          </button>
        </div>
      </div>

      {/* Statistics Display */}
      <div className="stats-display">
        <div className="stat-item">
          <span>💧</span>
          <span>{worldState.total_characters.toLocaleString()} Creations</span>
        </div>
        <div className="stat-item">
          <span>🌱</span>
          <span>{worldState.total_waters.toLocaleString()} Waters</span>
        </div>
        <div className="stat-item">
          <span className="capitalize">{worldState.season}</span>
          <span>•</span>
          <span className="capitalize">{worldState.current_phase}</span>
        </div>
      </div>

      {/* Bottom UI Bar - CA Spot and Roadmap */}
      <div className="bottom-ui-bar">
        <div className="text-white/70 text-sm">
          <span className="font-mono">CA: Coming Soon</span>
        </div>
        <button 
          className="minimal-button text-xs absolute right-6"
          onClick={() => window.location.href = '/roadmap'}
        >
          🗺️ Roadmap
        </button>
      </div>

      {/* Selected Character Card */}
      {selectedCharacter && (
        <CharacterCard
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
          onRefresh={handleRefresh}
        />
      )}

      {/* Auth Modal */}
      <SimpleAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Account Modal */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />

      {/* Creations Modal */}
      {user && (
        <CreationsModal
          isOpen={showCreationsModal}
          onClose={() => setShowCreationsModal(false)}
          userId={user.id}
        />
      )}
    </div>
  );
}

