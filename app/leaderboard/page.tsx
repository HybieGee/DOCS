'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WalletConnectButton } from '@/app/components/WalletConnectButton';
import Link from 'next/link';
import { shortenAddress } from '@/lib/utils/solana';

interface LeaderboardEntry {
  rank: number;
  username: string;
  solana_address: string;
  character_count?: number;
  legendary_count?: number;
  waters_given?: number;
  water_count?: number;
  level?: number;
  is_legendary?: boolean;
  owner_username?: string;
  owner_address?: string;
  name?: string;
  lore_count?: number;
  total_votes?: number;
  canon_count?: number;
}

type LeaderboardType = 'creators' | 'gardeners' | 'loved' | 'authors';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('creators');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab]);

  const fetchLeaderboard = async (type: LeaderboardType) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leaderboard?type=${type}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'creators', label: 'Top Creators', icon: '🎨' },
    { id: 'gardeners', label: 'Top Gardeners', icon: '🌱' },
    { id: 'loved', label: 'Most Loved', icon: '💧' },
    { id: 'authors', label: 'Lore Masters', icon: '📚' },
  ];

  const renderLeaderboardItem = (entry: LeaderboardEntry, index: number) => {
    const isTop3 = index < 3;
    const rankColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
    const rankColor = isTop3 ? rankColors[index] : 'text-white/60';

    return (
      <motion.div
        key={`${activeTab}-${entry.rank}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className={`bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all ${
          isTop3 ? 'ring-2 ring-white/20' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`text-2xl font-bold ${rankColor} min-w-[3rem]`}>
              #{entry.rank}
              {index === 0 && ' 👑'}
              {index === 1 && ' 🥈'}
              {index === 2 && ' 🥉'}
            </div>
            
            <div>
              {activeTab === 'loved' ? (
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2">
                    {entry.name}
                    {entry.is_legendary && <span className="text-yellow-400">👑</span>}
                  </h3>
                  <p className="text-white/60 text-sm">
                    Owned by {entry.owner_username || shortenAddress(entry.owner_address || '')}
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-white font-bold">{entry.username}</h3>
                  <p className="text-white/60 text-sm">{shortenAddress(entry.solana_address)}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            {activeTab === 'creators' && (
              <div>
                <div className="text-xl font-bold text-white">{entry.character_count}</div>
                <div className="text-white/60 text-sm">
                  {entry.legendary_count || 0} legendary
                </div>
              </div>
            )}
            
            {activeTab === 'gardeners' && (
              <div>
                <div className="text-xl font-bold text-white">{entry.waters_given}</div>
                <div className="text-white/60 text-sm">waters given</div>
              </div>
            )}
            
            {activeTab === 'loved' && (
              <div>
                <div className="text-xl font-bold text-white">{entry.water_count}</div>
                <div className="text-white/60 text-sm">Level {entry.level}</div>
              </div>
            )}
            
            {activeTab === 'authors' && (
              <div>
                <div className="text-xl font-bold text-white">{entry.lore_count}</div>
                <div className="text-white/60 text-sm">
                  {entry.canon_count || 0} canon, {entry.total_votes || 0} votes
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            Droplets of Creation
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="text-white/80 hover:text-white transition-colors">
              Profile
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
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Leaderboards</h1>
            <p className="text-white/80 text-lg">Celebrating the legends of our world</p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as LeaderboardType)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Leaderboard Content */}
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-6 bg-white/10 rounded"></div>
                        <div>
                          <div className="w-32 h-5 bg-white/10 rounded mb-2"></div>
                          <div className="w-24 h-4 bg-white/10 rounded"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-16 h-6 bg-white/10 rounded mb-1"></div>
                        <div className="w-20 h-4 bg-white/10 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Data Yet</h3>
                <p className="text-white/60">Be the first to make your mark!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaderboard.map((entry, index) => renderLeaderboardItem(entry, index))}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}