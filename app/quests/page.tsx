'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import { getApiUrl } from '@/lib/utils/api';

interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'achievement';
  requirement_type: string;
  requirement_count: number;
  token_reward: number;
  current_progress: number;
  completed: boolean;
  claimed: boolean;
  earned_at?: string;
}

interface QuestData {
  daily: Quest[];
  weekly: Quest[];
  achievements: Quest[];
}

export default function QuestsPage() {
  const { user } = useAuth();
  const [quests, setQuests] = useState<QuestData>({ daily: [], weekly: [], achievements: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'achievements'>('daily');
  const [claimingQuest, setClaimingQuest] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchQuests();
      // Track online time for daily quest
      const onlineInterval = setInterval(trackOnline, 60000); // Every minute
      // Refresh quests data
      const refreshInterval = setInterval(fetchQuests, 10000); // Every 10 seconds
      
      return () => {
        clearInterval(onlineInterval);
        clearInterval(refreshInterval);
      };
    }
  }, [user]);

  const fetchQuests = async () => {
    try {
      const response = await fetch(getApiUrl('/api/quests'), { 
        credentials: 'include' 
      });
      if (response.ok) {
        const data = await response.json();
        setQuests(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackOnline = async () => {
    try {
      await fetch(getApiUrl('/api/quests/track-online'), { 
        method: 'POST',
        credentials: 'include' 
      });
    } catch (error) {
      console.error('Failed to track online time:', error);
    }
  };

  const claimReward = async (questId: string) => {
    setClaimingQuest(questId);
    try {
      const response = await fetch(getApiUrl(`/api/quests/${questId}/claim`), {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh quests to update claimed status
        await fetchQuests();
        // Show success message (could add a toast notification here)
        console.log(`Claimed ${data.data.tokens_awarded} tokens from ${data.data.quest_name}!`);
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
    } finally {
      setClaimingQuest(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-white/60 mb-6">Please log in to view your quests</p>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 loading-spinner mx-auto mb-4"></div>
          <p className="text-white/60">Loading your quests...</p>
        </div>
      </div>
    );
  }

  const currentQuests = quests[activeTab] || [];
  const completedCount = currentQuests.filter(q => q.completed).length;
  const totalCount = currentQuests.length;

  return (
    <div className="h-screen bg-black text-white overflow-auto">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 gradient-text">Quests & Achievements</h1>
          <p className="text-white/60 text-lg">
            Complete quests to earn tokens and unlock achievements
          </p>
        </div>

        {/* Progress Summary */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {quests.daily.filter(q => q.completed).length}/{quests.daily.length}
              </div>
              <div className="text-sm text-white/60">Daily Quests</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {quests.weekly.filter(q => q.completed).length}/{quests.weekly.length}
              </div>
              <div className="text-sm text-white/60">Weekly Quests</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {quests.achievements.filter(q => q.completed).length}/{quests.achievements.length}
              </div>
              <div className="text-sm text-white/60">Achievements</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-4 mb-6">
          {(['daily', 'weekly', 'achievements'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white/20 text-white border border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab === 'achievements' ? 'Achievements' : `${tab} Quests`}
            </button>
          ))}
        </div>

        {/* Quest List */}
        <div className="space-y-4">
          {currentQuests.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-8 border border-white/10 text-center">
              <p className="text-white/60">No {activeTab} quests available</p>
            </div>
          ) : (
            currentQuests.map(quest => {
              const progressPercentage = Math.min((quest.current_progress / quest.requirement_count) * 100, 100);
              const canClaim = quest.completed && !quest.claimed;
              
              return (
                <div
                  key={quest.id}
                  className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border ${
                    quest.completed ? 'border-green-500/30' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        {quest.name}
                        {quest.completed && (
                          <span className="ml-2 text-green-400">✓</span>
                        )}
                      </h3>
                      <p className="text-white/60">{quest.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-400">
                        +{quest.token_reward}
                      </div>
                      <div className="text-sm text-white/60">$DROPLET</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white">
                        {quest.current_progress}/{quest.requirement_count}
                      </span>
                    </div>
                    <div className="bg-black/30 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          quest.completed 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Claim Button */}
                  {canClaim && (
                    <button
                      onClick={() => claimReward(quest.id)}
                      disabled={claimingQuest === quest.id}
                      className={`w-full py-3 rounded-lg font-semibold transition-all ${
                        claimingQuest === quest.id
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {claimingQuest === quest.id ? 'Claiming...' : 'Claim Reward'}
                    </button>
                  )}

                  {quest.claimed && (
                    <div className="text-center text-green-400 font-semibold">
                      ✓ Reward Claimed
                    </div>
                  )}

                  {quest.type === 'achievement' && quest.earned_at && (
                    <div className="text-center text-white/40 text-sm mt-2">
                      Earned on {new Date(quest.earned_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

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