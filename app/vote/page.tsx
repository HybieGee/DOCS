'use client';

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/utils/api';
import { useAuth } from '@/app/hooks/useAuth';

interface LoreEntry {
  id: string;
  character_id: string;
  character_name: string;
  character_image_url?: string;
  body: string;
  author_user_id: string;
  author_username: string;
  created_at: string;
  likes_count: number;
  user_liked: boolean;
  vote_count: number;
  user_voted: boolean;
  quality_score: number;
}

interface VotingStats {
  total_lore_entries: number;
  total_votes_cast: number;
  top_rated_count: number;
  your_votes_cast: number;
  your_lore_entries: number;
}

export default function VotePage() {
  const { user } = useAuth();
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
  const [votingStats, setVotingStats] = useState<VotingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'top' | 'my-votes'>('trending');
  const [sortBy, setSortBy] = useState<'votes' | 'likes' | 'quality' | 'recent'>('votes');

  const fetchLoreEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        sort: sortBy,
        limit: '50'
      });

      const response = await fetch(getApiUrl(`/api/voting/lore?${params}`), {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setLoreEntries(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch lore entries:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, sortBy]);

  const fetchVotingStats = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/voting/stats'), {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setVotingStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch voting stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchLoreEntries();
    fetchVotingStats();
  }, [activeTab, sortBy, fetchLoreEntries, fetchVotingStats]);

  const handleVote = async (loreId: string, voteType: 'up' | 'down') => {
    if (!user) {
      alert('Please log in to vote');
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/voting/lore/${loreId}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vote_type: voteType })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the lore entry in state
        setLoreEntries(prev => prev.map(entry =>
          entry.id === loreId
            ? {
                ...entry,
                vote_count: data.data.vote_count,
                user_voted: true,
                quality_score: data.data.quality_score
              }
            : entry
        ));

        // Refresh stats
        fetchVotingStats();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to vote');
      }
    } catch (error) {
      console.error('Voting error:', error);
      alert('Failed to vote. Please try again.');
    }
  };

  const handleLike = async (loreId: string, currentlyLiked: boolean) => {
    if (!user) return;

    try {
      const method = currentlyLiked ? 'DELETE' : 'POST';
      const response = await fetch(getApiUrl(`/api/lore/${loreId}/like`), {
        method,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setLoreEntries(prev => prev.map(entry => 
          entry.id === loreId 
            ? { ...entry, likes_count: data.data.likes_count, user_liked: data.data.liked || false }
            : entry
        ));
      }
    } catch (error) {
      console.error('Error liking lore:', error);
    }
  };

  const getTabDisplayName = (tab: string) => {
    const tabNames = {
      'trending': '🔥 Trending',
      'recent': '⏰ Recent',
      'top': '⭐ Top Rated',
      'my-votes': '🗳️ My Votes'
    };
    return tabNames[tab as keyof typeof tabNames] || tab;
  };

  const getQualityBadge = (score: number) => {
    if (score >= 90) return { text: 'Legendary', color: 'bg-yellow-500' };
    if (score >= 75) return { text: 'Epic', color: 'bg-purple-500' };
    if (score >= 60) return { text: 'Rare', color: 'bg-blue-500' };
    if (score >= 40) return { text: 'Common', color: 'bg-green-500' };
    return { text: 'Basic', color: 'bg-gray-500' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading lore voting...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <div className="flex-1 max-w-6xl mx-auto w-full p-6 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Lore Voting</h1>
          <p className="text-white/60">
            Vote on community lore to help determine the best stories and reward quality content
          </p>
        </div>

        {/* Voting Stats */}
        {votingStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-4 border border-white/10">
              <div className="text-sm text-white/60">Total Lore</div>
              <div className="text-2xl font-bold text-blue-400">{votingStats.total_lore_entries}</div>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-4 border border-white/10">
              <div className="text-sm text-white/60">Votes Cast</div>
              <div className="text-2xl font-bold text-green-400">{votingStats.total_votes_cast}</div>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-4 border border-white/10">
              <div className="text-sm text-white/60">Top Rated</div>
              <div className="text-2xl font-bold text-yellow-400">{votingStats.top_rated_count}</div>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-4 border border-white/10">
              <div className="text-sm text-white/60">Your Votes</div>
              <div className="text-2xl font-bold text-purple-400">{votingStats.your_votes_cast}</div>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-4 border border-white/10">
              <div className="text-sm text-white/60">Your Lore</div>
              <div className="text-2xl font-bold text-cyan-400">{votingStats.your_lore_entries}</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-4 mb-6">
          {['trending', 'recent', 'top', 'my-votes'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'trending' | 'recent' | 'top' | 'my-votes')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === tab
                  ? 'bg-white/20 text-white border border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {getTabDisplayName(tab)}
            </button>
          ))}
        </div>

        {/* Sort Controls */}
        <div className="flex gap-4 mb-6">
          <div className="text-sm text-white/60 flex items-center">Sort by:</div>
          {[
            { id: 'votes', label: 'Votes' },
            { id: 'likes', label: 'Likes' },
            { id: 'quality', label: 'Quality' },
            { id: 'recent', label: 'Recent' }
          ].map(sort => (
            <button
              key={sort.id}
              onClick={() => setSortBy(sort.id as 'votes' | 'likes' | 'quality' | 'recent')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                sortBy === sort.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {sort.label}
            </button>
          ))}
        </div>

        {/* Lore Entries - Scrollable Container */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2" style={{ maxHeight: 'calc(100vh - 400px)' }}>
          {loreEntries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-white/60 mb-4">No lore entries found</div>
              <p className="text-sm text-white/40">
                {activeTab === 'my-votes' ? 'You haven\'t voted on any lore yet.' : 'Be the first to create some lore!'}
              </p>
            </div>
          ) : (
            loreEntries.map((entry, index) => {
              const qualityBadge = getQualityBadge(entry.quality_score);
              
              return (
                <div key={entry.id} className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    {/* Voting Controls */}
                    <div className="flex flex-col items-center gap-2 min-w-[60px]">
                      <button
                        onClick={() => handleVote(entry.id, 'up')}
                        disabled={entry.user_voted || entry.author_user_id === user?.id}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                          entry.user_voted 
                            ? 'bg-green-500 text-white' 
                            : 'bg-white/10 hover:bg-green-500/20 text-white/60 hover:text-green-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        ▲
                      </button>
                      
                      <div className="text-center">
                        <div className={`font-bold ${entry.vote_count > 0 ? 'text-green-400' : 'text-white/60'}`}>
                          {entry.vote_count}
                        </div>
                        <div className="text-xs text-white/40">votes</div>
                      </div>
                      
                      <button
                        onClick={() => handleVote(entry.id, 'down')}
                        disabled={entry.user_voted || entry.author_user_id === user?.id}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                          entry.user_voted 
                            ? 'bg-red-500 text-white' 
                            : 'bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        ▼
                      </button>
                    </div>

                    {/* Character Image */}
                    {entry.character_image_url && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                        <img 
                          src={entry.character_image_url} 
                          alt={entry.character_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-white">{entry.character_name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${qualityBadge.color}`}>
                            {qualityBadge.text}
                          </span>
                          <span className="text-xs text-white/40">#{index + 1}</span>
                        </div>
                        <div className="text-xs text-white/40">
                          by {entry.author_username} • {new Date(entry.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <p className="text-white/80 mb-4 leading-relaxed">{entry.body}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLike(entry.id, entry.user_liked)}
                            disabled={!user}
                            className={`flex items-center gap-1 text-sm transition-colors ${
                              entry.user_liked 
                                ? 'text-red-400 hover:text-red-300' 
                                : 'text-white/60 hover:text-red-400'
                            }`}
                          >
                            <span>{entry.user_liked ? '❤️' : '🤍'}</span>
                            <span>{entry.likes_count}</span>
                          </button>

                          <div className="text-sm text-white/40">
                            Quality Score: {entry.quality_score}%
                          </div>
                        </div>

                        {entry.author_user_id === user?.id && (
                          <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                            Your Lore
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h3 className="font-semibold text-blue-400 mb-2">How Voting Works</h3>
          <ul className="text-sm text-white/70 space-y-1">
            <li>• Vote up (▲) for high-quality lore that adds value to the story</li>
            <li>• Vote down (▼) for low-quality, spam, or inappropriate content</li>
            <li>• You can only vote once per lore entry</li>
            <li>• You cannot vote on your own lore</li>
            <li>• Quality scores are calculated based on community votes and engagement</li>
            <li>• Top-rated lore may be featured and earn special rewards</li>
          </ul>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            ← Back to World
          </button>
        </div>
      </div>
    </div>
  );
}