'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import { getApiUrl } from '@/lib/utils/api';

interface TokenStats {
  total_balance: number;
  today_earned: number;
  daily_cap: number;
  streak_days: number;
  streak_multiplier: number;
  lifetime_earned: number;
  rank: number;
  total_users: number;
}

interface EarningHistory {
  date: string;
  amount: number;
  source: 'minting' | 'watering' | 'voting' | 'passive' | 'bonus';
  description: string;
}

export default function TokensPage() {
  const { user } = useAuth();
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [earningHistory, setEarningHistory] = useState<EarningHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'leaderboard'>('overview');

  useEffect(() => {
    if (user) {
      fetchTokenData();
      const interval = setInterval(fetchTokenData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchTokenData = async () => {
    try {
      const [statsResponse, historyResponse] = await Promise.all([
        fetch(getApiUrl('/api/tokens/stats'), { credentials: 'include' }),
        fetch(getApiUrl('/api/tokens/history'), { credentials: 'include' })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setTokenStats(statsData.data);
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setEarningHistory(historyData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch token data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-white/60 mb-6">Please log in to view your token dashboard</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading || !tokenStats) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 loading-spinner mx-auto mb-4"></div>
          <p className="text-white/60">Loading your token dashboard...</p>
        </div>
      </div>
    );
  }

  const remainingToday = Math.max(0, tokenStats.daily_cap - tokenStats.today_earned);
  const dailyProgress = (tokenStats.today_earned / tokenStats.daily_cap) * 100;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 gradient-text">$DROPLET Dashboard</h1>
          <p className="text-white/60 text-lg">
            Track your earnings, view your balance, and monitor your progress
          </p>
        </div>

        {/* Key Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-lg p-6 border border-blue-500/30">
            <div className="text-blue-400 text-sm font-medium uppercase tracking-wide mb-2">Total Balance</div>
            <div className="text-3xl font-bold text-white">{tokenStats.total_balance.toLocaleString()}</div>
            <div className="text-blue-300 text-sm mt-1">$DROPLET</div>
          </div>

          <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-lg p-6 border border-green-500/30">
            <div className="text-green-400 text-sm font-medium uppercase tracking-wide mb-2">Today&apos;s Earnings</div>
            <div className="text-3xl font-bold text-white">{tokenStats.today_earned.toLocaleString()}</div>
            <div className="text-green-300 text-sm mt-1">
              {remainingToday.toLocaleString()} remaining
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-lg p-6 border border-purple-500/30">
            <div className="text-purple-400 text-sm font-medium uppercase tracking-wide mb-2">Streak</div>
            <div className="text-3xl font-bold text-white">{tokenStats.streak_days}</div>
            <div className="text-purple-300 text-sm mt-1">
              {tokenStats.streak_multiplier}x multiplier
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/50 to-orange-800/50 rounded-lg p-6 border border-yellow-500/30">
            <div className="text-yellow-400 text-sm font-medium uppercase tracking-wide mb-2">Rank</div>
            <div className="text-3xl font-bold text-white">#{tokenStats.rank}</div>
            <div className="text-yellow-300 text-sm mt-1">
              of {tokenStats.total_users.toLocaleString()} users
            </div>
          </div>
        </div>

        {/* Daily Progress */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10 mb-8">
          <h2 className="text-xl font-semibold mb-4">Daily Progress</h2>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-white/60">Today&apos;s Earnings</span>
            <span className="text-white">{tokenStats.today_earned.toLocaleString()} / {tokenStats.daily_cap.toLocaleString()}</span>
          </div>
          <div className="bg-black/30 rounded-full h-4 overflow-hidden mb-4">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(dailyProgress, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-white/60">Remaining:</span>
              <div className="font-bold text-green-400">{remainingToday.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-white/60">Completion:</span>
              <div className="font-bold text-blue-400">{Math.min(dailyProgress, 100).toFixed(1)}%</div>
            </div>
            <div>
              <span className="text-white/60">Streak Bonus:</span>
              <div className="font-bold text-purple-400">+{((tokenStats.streak_multiplier - 1) * 100).toFixed(0)}%</div>
            </div>
            <div>
              <span className="text-white/60">Time Left:</span>
              <div className="font-bold text-orange-400">
                {new Date(Date.now() + (24 - new Date().getHours()) * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-4 mb-6">
          {(['overview', 'history', 'leaderboard'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white/20 text-white border border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4">Earning Sources</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">Daily Minting</span>
                  <span className="font-bold text-green-400">500-2,500/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Watering (max 72/day)</span>
                  <span className="font-bold text-blue-400">7,200/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Voting (max 72/day)</span>
                  <span className="font-bold text-purple-400">3,600/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Passive Rewards</span>
                  <span className="font-bold text-cyan-400">10-400/day</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4">Achievement Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-white/60 text-sm">Lifetime Earnings</span>
                    <span className="text-white text-sm">{tokenStats.lifetime_earned.toLocaleString()}</span>
                  </div>
                  <div className="bg-black/30 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 h-full rounded-full"
                      style={{ width: `${Math.min((tokenStats.lifetime_earned / 100000) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-white/40 mt-1">Next milestone: 100,000 $DROPLET</div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-white/60 text-sm">Daily Streak</span>
                    <span className="text-white text-sm">{tokenStats.streak_days} days</span>
                  </div>
                  <div className="bg-black/30 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full"
                      style={{ width: `${Math.min((tokenStats.streak_days / 100) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-white/40 mt-1">Next bonus: {tokenStats.streak_days < 7 ? '7' : tokenStats.streak_days < 30 ? '30' : '100'} days</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
            <h3 className="text-xl font-semibold mb-4">Recent Earning History</h3>
            {earningHistory.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <p>No earnings recorded yet.</p>
                <p className="text-sm mt-2">Start minting, watering, or voting to see your history!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {earningHistory.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                    <div>
                      <div className="font-medium text-white">{entry.description}</div>
                      <div className="text-sm text-white/60">
                        {new Date(entry.date).toLocaleDateString()} • {entry.source}
                      </div>
                    </div>
                    <div className="font-bold text-green-400">
                      +{entry.amount.toLocaleString()} $DROPLET
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
            <h3 className="text-xl font-semibold mb-4">Community Leaderboard</h3>
            <div className="text-center py-8 text-white/60">
              <p>Leaderboard feature coming soon!</p>
              <p className="text-sm mt-2">Compete with other users for the top spots</p>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all"
          >
            Back to Game
          </button>
        </div>
      </div>
    </div>
  );
}