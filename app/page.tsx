'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WorldCanvas } from './components/WorldCanvas';
import { CharacterCard } from './components/CharacterCard';
import { SimpleAuthModal } from './components/SimpleAuthModal';
import { useAuth } from './hooks/useAuth';
import type { Character } from '@/lib/types';

export default function Home() {
  const { user, loading } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [worldState, setWorldState] = useState({
    total_characters: 0,
    total_waters: 0,
    season: 'spring',
    current_phase: 'day',
  });
  const [isMinting, setIsMinting] = useState(false);\n  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    fetchWorldState();
    fetchCharacters();
    connectToRealtime();
  }, []);

  const fetchWorldState = async () => {
    try {
      const response = await fetch('/api/world/state');
      const data = await response.json();
      if (data.success) {
        setWorldState(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch world state:', error);
    }
  };

  const fetchCharacters = async () => {
    try {
      const response = await fetch('/api/characters');
      const data = await response.json();
      if (data.success) {
        setCharacters(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    }
  };

  const connectToRealtime = () => {
    const ws = new WebSocket(
      process.env.NODE_ENV === 'production'
        ? 'wss://api.dropletsofcreation.com/api/realtime'
        : 'ws://localhost:8787/api/realtime'
    );

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleRealtimeMessage(message);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => ws.close();
  };

  const handleRealtimeMessage = (message: any) => {
    switch (message.type) {
      case 'character_spawn':
        setCharacters((prev) => [message.payload, ...prev]);
        break;
      case 'water':
      case 'level_up':
        setCharacters((prev) =>
          prev.map((char) =>
            char.id === message.payload.character_id
              ? { ...char, water_count: message.payload.water_count, level: message.payload.level }
              : char
          )
        );
        break;
      case 'milestone':
        setWorldState((prev) => ({ ...prev, ...message.payload }));
        break;
    }
  };

  const handleMint = async () => {
    if (!user || isMinting) return;

    setIsMinting(true);
    try {
      const response = await fetch('/api/characters/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mint character');
      }

      const data = await response.json();
      // Character will be added via realtime update
    } catch (error) {
      console.error('Mint error:', error);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Rain Animation Background */}
      <div className="absolute inset-0 pointer-events-none">
        <RainAnimation />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Droplets of Creation
            </h1>
            <span className="text-yellow-400 font-bold">$DOC</span>
          </div>
          
          <div className="flex items-center gap-6">
            {/* World Stats */}
            <div className="flex gap-4 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">💧</span>
                <span>{worldState.total_characters} Characters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">🌱</span>
                <span>{worldState.total_waters} Waters</span>
              </div>
            </div>
            
{user ? (
              <div className="flex items-center gap-4">
                <span className="text-white">Welcome, {user.username}!</span>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  Account
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
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
        <section className="container mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-5xl font-bold text-white mb-6">
              Where Raindrops Become Legends
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Mint your droplet, water characters to help them evolve, and shape the narrative of our living world.
            </p>
            
            {user ? (
              <button
                onClick={handleMint}
                disabled={isMinting}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-full text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
              >
                {isMinting ? 'Minting...' : 'Mint a Droplet 💧'}
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-white/60">Create an account to start minting</p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-full text-lg transition-all transform hover:scale-105"
                >
                  Create Account / Login
                </button>
              </div>
            )}
          </motion.div>
        </section>

        {/* World Canvas */}
        <section className="relative h-[600px] overflow-hidden">
          <WorldCanvas
            characters={characters}
            worldState={worldState}
            onCharacterClick={setSelectedCharacter}
          />
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

// Rain Animation Component
function RainAnimation() {
  return (
    <div className="rain-container">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="raindrop"
          initial={{ y: -100, x: Math.random() * window.innerWidth }}
          animate={{
            y: window.innerHeight + 100,
            x: Math.random() * window.innerWidth,
          }}
          transition={{
            duration: Math.random() * 2 + 1,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 2,
          }}
          style={{
            position: 'absolute',
            width: '2px',
            height: '10px',
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.6))',
          }}
        />
      ))}
    </div>
  );
}