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

      await response.json();
      // Character will be added via realtime update
    } catch (error) {
      console.error('Mint error:', error);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <RainAnimation />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/10 to-purple-900/20" />
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-blue-400/30 rounded-full float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 glass border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl glow-blue">
                💧
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  Droplets of Creation
                </h1>
                <span className="text-yellow-400 text-sm font-semibold tracking-wide">$DOC</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            {/* World Stats */}
            <div className="flex gap-6 text-white/90 text-sm font-medium">
              <div className="flex items-center gap-2 glass px-3 py-2 rounded-full">
                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-blue-400 text-xs">💧</span>
                </div>
                <span>{worldState.total_characters.toLocaleString()} Characters</span>
              </div>
              <div className="flex items-center gap-2 glass px-3 py-2 rounded-full">
                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-green-400 text-xs">🌱</span>
                </div>
                <span>{worldState.total_waters.toLocaleString()} Waters</span>
              </div>
            </div>
            
            {user ? (
              <div className="flex items-center gap-4">
                <div className="text-white/90 font-medium">
                  Welcome, <span className="text-blue-400">{user.username}</span>!
                </div>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="glass px-4 py-2 rounded-lg hover:bg-white/20 transition-all text-white/80 hover:text-white"
                >
                  Account
                </button>
                <button
                  onClick={() => logout()}
                  className="glass px-4 py-2 rounded-lg hover:bg-red-500/20 transition-all text-white/80 hover:text-red-400"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all btn-hover glow-blue"
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="max-w-5xl mx-auto"
          >
            <div className="mb-8">
              <motion.h2 
                className="text-7xl md:text-8xl font-bold gradient-text mb-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.2 }}
              >
                Where Raindrops
              </motion.h2>
              <motion.h2 
                className="text-7xl md:text-8xl font-bold text-white mb-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.4 }}
              >
                Become Legends
              </motion.h2>
            </div>

            <motion.p 
              className="text-2xl md:text-3xl text-white/90 mb-12 font-light leading-relaxed max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Mint your droplet, water characters to help them evolve, and shape the narrative of our living world.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              {user ? (
                <button
                  onClick={handleMint}
                  disabled={isMinting}
                  className="group relative px-12 py-6 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 hover:from-blue-700 hover:via-purple-700 hover:to-cyan-700 text-white font-bold rounded-2xl text-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100 glow-blue btn-hover ripple-effect"
                >
                  <div className="flex items-center gap-3">
                    {isMinting ? (
                      <>
                        <div className="w-6 h-6 loading-spinner" />
                        <span>Minting...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">💧</span>
                        <span>Mint a Droplet</span>
                      </>
                    )}
                  </div>
                </button>
              ) : (
                <div className="space-y-6">
                  <p className="text-white/70 text-lg">Create an account to start your legend</p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="group relative px-12 py-6 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl text-xl transition-all transform hover:scale-105 glow-green btn-hover shimmer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌟</span>
                      <span>Create Account / Login</span>
                    </div>
                  </button>
                </div>
              )}
            </motion.div>

            {/* Feature Cards */}
            <motion.div 
              className="grid md:grid-cols-3 gap-8 mt-20"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              <div className="glass p-8 rounded-2xl glow-blue">
                <div className="text-4xl mb-4">💧</div>
                <h3 className="text-xl font-semibold text-white mb-3">Mint Droplets</h3>
                <p className="text-white/70">Create unique character droplets that evolve and grow with your care.</p>
              </div>
              <div className="glass p-8 rounded-2xl glow-purple">
                <div className="text-4xl mb-4">🌱</div>
                <h3 className="text-xl font-semibold text-white mb-3">Water & Evolve</h3>
                <p className="text-white/70">Give water to characters to help them level up and unlock new abilities.</p>
              </div>
              <div className="glass p-8 rounded-2xl glow-green">
                <div className="text-4xl mb-4">📖</div>
                <h3 className="text-xl font-semibold text-white mb-3">Shape Lore</h3>
                <p className="text-white/70">Submit stories and vote on canon lore that becomes part of the world.</p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* World Canvas */}
        <section className="relative h-[700px] overflow-hidden mt-20">
          <div className="absolute inset-0 glass border-y border-white/10">
            <WorldCanvas
              characters={characters}
              worldState={worldState}
              onCharacterClick={setSelectedCharacter}
            />
          </div>
          
          {/* Season Indicator */}
          <div className="absolute top-6 left-6 glass px-4 py-2 rounded-full">
            <div className="flex items-center gap-2 text-white/90">
              <span className="capitalize font-medium">{worldState.season}</span>
              <span className="text-yellow-400">•</span>
              <span className="capitalize">{worldState.current_phase}</span>
            </div>
          </div>
        </section>

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
      </main>
    </div>
  );
}

// Enhanced Rain Animation Component
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
      {Array.from({ length: 60 }).map((_, i) => {
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
              x: startX + (Math.random() - 0.5) * 20, // Very slight drift
            }}
            transition={{
              duration: Math.random() * 2 + 3, // Slower: 3-5 seconds
              repeat: Infinity,
              ease: 'linear',
              delay: Math.random() * 5,
            }}
            style={{
              position: 'absolute',
              width: `${Math.random() * 1.5 + 0.5}px`, // Thinner raindrops
              height: `${Math.random() * 20 + 15}px`, // Longer raindrops
              background: `linear-gradient(to bottom, transparent, rgba(59, 130, 246, ${0.4 + Math.random() * 0.3}))`,
              borderRadius: '0 0 50% 50%',
              filter: 'blur(0.3px)',
            }}
          />
        );
      })}
      
      {/* Occasional gentle lightning */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: [0, 0, 0, 0, 0, 0, 0, 0.05, 0, 0.15, 0, 0, 0, 0, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          background: 'linear-gradient(180deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
        }}
      />
    </div>
  );
}