'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorldCanvas } from './components/WorldCanvas';
import { CharacterCard } from './components/CharacterCard';
import { SimpleAuthModal } from './components/SimpleAuthModal';
import { useAuth } from './hooks/useAuth';
import type { Character } from '@/lib/types';
import { getApiUrl, getWebSocketUrl } from '@/lib/utils/api';

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
  const [canCreateToday, setCanCreateToday] = useState(true);

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
    const interval = setInterval(() => {
      fetchWorldState();
      fetchCharacters();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchWorldState, fetchCharacters]);

  const handleRealtimeMessage = useCallback((message: { type: string; payload: Record<string, unknown> }) => {
    switch (message.type) {
      case 'character_spawn':
        setCharacters((prev) => [message.payload as unknown as Character, ...prev]);
        break;
      case 'water':
      case 'level_up':
        setCharacters((prev) =>
          prev.map((char) =>
            char.id === message.payload.character_id
              ? { ...char, water_count: message.payload.water_count as number, level: message.payload.level as number }
              : char
          )
        );
        break;
      case 'milestone':
        setWorldState((prev) => ({ ...prev, ...message.payload }));
        break;
    }
  }, []);

  const connectToRealtime = useCallback(() => {
    const ws = new WebSocket(getWebSocketUrl('/api/realtime'));

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleRealtimeMessage(message);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => ws.close();
  }, [handleRealtimeMessage]);

  useEffect(() => {
    fetchWorldState();
    fetchCharacters();
    connectToRealtime();
  }, [fetchWorldState, fetchCharacters, connectToRealtime]);

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
        
        // Add to characters display
        setCharacters(prev => [creationAsCharacter, ...prev]);
        
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
                onClick={() => setShowAuthModal(true)}
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
                      <span>Mint Today's Droplet</span>
                    </div>
                  )}
                </button>
              ) : (
                <div className="text-white/60 text-sm text-center">
                  <div>✅ Today's droplet created!</div>
                  <div className="text-xs text-white/40 mt-1">Come back tomorrow for another</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-white/50 text-sm">Login to mint</div>
          )}
        </div>

        {/* Top Right - Future buttons placeholder */}
        <div className="top-right-buttons">
          <button 
            className="minimal-button text-xs"
            onClick={() => alert('Info coming soon!')}
          >
            Info
          </button>
          <button 
            className="minimal-button text-xs"
            onClick={() => alert('Lore system coming soon!')}
          >
            Lore
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

      {/* Bottom UI Bar - CA Spot */}
      <div className="bottom-ui-bar">
        <div className="text-white/70 text-sm">
          <span className="font-mono">CA: Coming Soon</span>
        </div>
      </div>

      {/* Selected Character Card */}
      {selectedCharacter && (
        <CharacterCard
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
        />
      )}

      {/* Auth Modal */}
      <SimpleAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

