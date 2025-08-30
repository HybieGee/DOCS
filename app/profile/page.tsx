'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/hooks/useAuth';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectButton } from '@/app/components/WalletConnectButton';
import Link from 'next/link';
import type { Character } from '@/lib/types';
import { shortenAddress } from '@/lib/utils/solana';

interface UserStats {
  user: {
    username: string;
    solana_address: string;
    joined: string;
  };
  characters: {
    total: number;
    legendary: number;
  };
  waters: {
    given: number;
    received: number;
  };
  lore: {
    submissions: number;
    votes: number;
    canon: number;
  };
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { connected, publicKey } = useWallet();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [ownedCharacters, setOwnedCharacters] = useState<Character[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (user && connected && publicKey) {
      fetchUserStats();
      fetchOwnedCharacters();
    }
  }, [user, connected, publicKey]);

  const fetchUserStats = async () => {
    if (!publicKey) return;

    setLoadingStats(true);
    try {
      const response = await fetch(`/api/leaderboard/user/${publicKey.toBase58()}`);
      const data = await response.json();
      if (data.success) {
        setUserStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchOwnedCharacters = async () => {
    try {
      const response = await fetch(`/api/characters?owner=${user?.id}`);
      const data = await response.json();
      if (data.success) {
        setOwnedCharacters(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch owned characters:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user || !connected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-900 via-blue-900 to-indigo-900">
        <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Droplets of Creation
            </Link>
            <WalletConnectButton />
          </div>
        </header>
        
        <main className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Connect Your Wallet</h1>
            <p className="text-white/80 mb-8">Please connect your wallet to view your profile</p>
            <WalletConnectButton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            Droplets of Creation
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/leaderboard" className="text-white/80 hover:text-white transition-colors">
              Leaderboard
            </Link>
            <WalletConnectButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Profile Header */}
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{user.username}</h1>
                <p className="text-white/60">{shortenAddress(user.solana_address)}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-sm">Member since</p>
                <p className="text-white">
                  {new Date(userStats?.user.joined || user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            {loadingStats ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-4 animate-pulse">
                    <div className="h-6 bg-white/10 rounded mb-2"></div>
                    <div className="h-8 bg-white/10 rounded"></div>
                  </div>
                ))}
              </div>
            ) : userStats ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-lg p-4 border border-white/10">
                  <h3 className="text-white/80 text-sm font-medium mb-1">Characters</h3>
                  <div className="text-2xl font-bold text-white">{userStats.characters.total}</div>
                  {userStats.characters.legendary > 0 && (
                    <div className="text-yellow-400 text-sm">{userStats.characters.legendary} legendary</div>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-lg p-4 border border-white/10">
                  <h3 className="text-white/80 text-sm font-medium mb-1">Waters Given</h3>
                  <div className="text-2xl font-bold text-white">{userStats.waters.given}</div>
                </div>
                
                <div className="bg-gradient-to-br from-pink-600/20 to-rose-600/20 rounded-lg p-4 border border-white/10">
                  <h3 className="text-white/80 text-sm font-medium mb-1">Waters Received</h3>
                  <div className="text-2xl font-bold text-white">{userStats.waters.received}</div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-lg p-4 border border-white/10">
                  <h3 className="text-white/80 text-sm font-medium mb-1">Lore Written</h3>
                  <div className="text-2xl font-bold text-white">{userStats.lore.submissions}</div>
                  {userStats.lore.canon > 0 && (
                    <div className="text-amber-400 text-sm">{userStats.lore.canon} canon</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Owned Characters */}
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Your Characters</h2>
            {ownedCharacters.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60 mb-4">You haven&apos;t minted any characters yet.</p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
                >
                  Mint Your First Droplet
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ownedCharacters.map((character) => (
                  <CharacterProfileCard key={character.id} character={character} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// Character card for profile page
function CharacterProfileCard({ character }: { character: Character }) {
  const colors = character.color_palette ? JSON.parse(character.color_palette) : { primary: '#4A90E2' };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          {character.name}
          {character.is_legendary && <span className="text-yellow-400">👑</span>}
        </h3>
        <div 
          className="w-6 h-6 rounded-full border-2 border-white/20"
          style={{ backgroundColor: colors.primary }}
        />
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-white/60">Level</span>
          <span className="text-white font-medium">{character.level}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Waters</span>
          <span className="text-white font-medium">{character.water_count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Born</span>
          <span className="text-white font-medium">
            {new Date(character.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}