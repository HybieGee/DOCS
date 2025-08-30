'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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


  const handleMint = async () => {
    if (!user || isMinting) return;

    setIsMinting(true);
    try {
      const response = await fetch(getApiUrl('/api/characters/mint'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mint character');
      }

      const result = await response.json();
      console.log('Mint success:', result);
      
      // Immediately refresh data for responsiveness
      await Promise.all([
        fetchCharacters(),
        fetchWorldState()
      ]);
      
    } catch (error) {
      console.error('Mint error:', error);
      alert(error instanceof Error ? error.message : 'Failed to mint character');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/loopback.mp4" type="video/mp4" />
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
                  <span>Mint Droplet</span>
                </div>
              )}
            </button>
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

// Minimalist Rain Animation Component
function RainAnimation() {
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      
      const handleResize = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return (
    <div className="rain-container">
      {Array.from({ length: 40 }).map((_, i) => {
        const startX = Math.random() * dimensions.width;
        return (
          <motion.div
            key={i}
            className="raindrop"
            initial={{ 
              y: -100, 
              x: startX,
              scale: Math.random() * 0.3 + 0.7
            }}
            animate={{
              y: dimensions.height + 100,
              x: startX + (Math.random() - 0.5) * 15,
            }}
            transition={{
              duration: Math.random() * 2 + 4, // Slower: 4-6 seconds
              repeat: Infinity,
              ease: 'linear',
              delay: Math.random() * 6,
            }}
            style={{
              position: 'absolute',
              width: `${Math.random() * 1 + 0.5}px`, // Thinner raindrops
              height: `${Math.random() * 15 + 10}px`, // Shorter raindrops
              background: `linear-gradient(to bottom, transparent, rgba(255, 255, 255, ${0.1 + Math.random() * 0.1}))`,
              borderRadius: '0 0 50% 50%',
              filter: 'blur(0.2px)',
            }}
          />
        );
      })}
    </div>
  );
}