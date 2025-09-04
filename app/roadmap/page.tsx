'use client';

import { useState } from 'react';

interface RoadmapItem {
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned';
}

interface Quarter {
  id: string;
  title: string;
  items: RoadmapItem[];
}

export default function RoadmapPage() {
  const [selectedQuarter, setSelectedQuarter] = useState<string>('q4-2025');

  const roadmap: Quarter[] = [
    {
      id: 'q4-2025',
      title: 'Q4 2025',
      items: [
        {
          title: '🎯 Quests & Achievements',
          description: 'Daily and weekly quests with token rewards and achievement badges',
          status: 'completed'
        },
        {
          title: '💰 Token Economy',
          description: 'Automatic earning system with daily caps and streak bonuses',
          status: 'completed'
        },
        {
          title: '🎄 Seasonal Content',
          description: 'Holiday-themed droplets and special winter events',
          status: 'planned'
        },
        {
          title: '👥 Referral System',
          description: 'Invite friends for bonus rewards and shared benefits',
          status: 'planned'
        },
        {
          title: '🏆 Leaderboards',
          description: 'Multiple ranking categories with seasonal resets',
          status: 'planned'
        }
      ]
    },
    {
      id: 'q1-2026',
      title: 'Q1 2026',
      items: [
        {
          title: '🎮 Mini-Games',
          description: 'Droplet care games, puzzles, and memory games with token rewards',
          status: 'planned'
        },
        {
          title: '🏅 Tournament System',
          description: 'Bracket-style competitions with prize pools',
          status: 'planned'
        },
        {
          title: '🎨 Customization Studio',
          description: 'Advanced editor for droplet appearance and accessories',
          status: 'planned'
        },
        {
          title: '🏡 Personal Habitats',
          description: 'Customizable homes and environments for your droplets',
          status: 'planned'
        },
        {
          title: '📊 Advanced Analytics',
          description: 'Personal stats dashboard with optimization suggestions',
          status: 'planned'
        }
      ]
    },
    {
      id: 'q2-2026',
      title: 'Q2 2026',
      items: [
        {
          title: '👫 Social Features',
          description: 'Friend system, direct messaging, and droplet showcases',
          status: 'planned'
        },
        {
          title: '⚔️ Guilds & Teams',
          description: 'Form groups, guild challenges, and shared guild droplets',
          status: 'planned'
        },
        {
          title: '🧬 Breeding System',
          description: 'Combine droplets to create offspring with mixed traits',
          status: 'planned'
        },
        {
          title: '🌍 World Building',
          description: 'Weather effects, day/night cycles, and seasonal changes',
          status: 'planned'
        },
        {
          title: '🎁 Special Events',
          description: 'Limited-time legendary spawns and community events',
          status: 'planned'
        }
      ]
    },
    {
      id: 'q3-2026',
      title: 'Q3 2026',
      items: [
        {
          title: '🏪 Marketplace',
          description: 'Trade droplets between users with auction system',
          status: 'planned'
        },
        {
          title: '🖼️ NFT Integration',
          description: 'Export droplets as NFTs with real ownership',
          status: 'planned'
        },
        {
          title: '📱 Mobile App',
          description: 'Native iOS/Android app with push notifications',
          status: 'planned'
        },
        {
          title: '🎯 Advanced Quests',
          description: 'Story-driven quest chains with unique rewards',
          status: 'planned'
        },
        {
          title: '🌟 Community Features',
          description: 'User-generated content, mods, and community voting',
          status: 'planned'
        }
      ]
    }
  ];

  const currentQuarter = roadmap.find(q => q.id === selectedQuarter) || roadmap[0];

  return (
    <div className="h-screen bg-black text-white overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 gradient-text">Development Roadmap</h1>
          <p className="text-white/60 text-lg">
            Our vision for the future of Droplets of Creation
          </p>
        </div>

        {/* Timeline Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            {roadmap.map((quarter) => (
              <button
                key={quarter.id}
                onClick={() => setSelectedQuarter(quarter.id)}
                className={`px-6 py-3 rounded-lg transition-all font-medium ${
                  selectedQuarter === quarter.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                }`}
              >
                {quarter.title}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10 mb-8">
          <h2 className="text-2xl font-semibold mb-4">{currentQuarter.title} Overview</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-400">
                {currentQuarter.items.filter(i => i.status === 'completed').length}
              </div>
              <div className="text-sm text-white/60">Completed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400">
                {currentQuarter.items.filter(i => i.status === 'in-progress').length}
              </div>
              <div className="text-sm text-white/60">In Progress</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">
                {currentQuarter.items.filter(i => i.status === 'planned').length}
              </div>
              <div className="text-sm text-white/60">Planned</div>
            </div>
          </div>
        </div>

        {/* Roadmap Items */}
        <div className="space-y-4">
          {currentQuarter.items.map((item, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border transition-all ${
                item.status === 'completed' 
                  ? 'border-green-500/30 bg-green-900/10' 
                  : item.status === 'in-progress'
                  ? 'border-yellow-500/30 bg-yellow-900/10'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-3">
                    {item.title}
                    {item.status === 'completed' && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                        COMPLETED
                      </span>
                    )}
                    {item.status === 'in-progress' && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                        IN PROGRESS
                      </span>
                    )}
                  </h3>
                  <p className="text-white/70">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Future Vision */}
        <div className="mt-12 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg p-8 border border-purple-500/30">
          <h2 className="text-2xl font-semibold mb-4">🚀 Long-Term Vision</h2>
          <p className="text-white/80 leading-relaxed mb-4">
            Droplets of Creation aims to become the premier digital creature nurturing ecosystem on the blockchain. 
            Our goal is to create a vibrant, player-driven economy where creativity, community, and competition thrive together.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-black/30 rounded-lg p-4">
              <h3 className="font-semibold text-purple-400 mb-2">Community First</h3>
              <p className="text-sm text-white/60">Building features that bring players together and reward collaboration</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <h3 className="font-semibold text-blue-400 mb-2">Play & Earn</h3>
              <p className="text-sm text-white/60">Sustainable token economy that rewards active participation</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <h3 className="font-semibold text-green-400 mb-2">True Ownership</h3>
              <p className="text-sm text-white/60">Your droplets, your assets, your creative expression</p>
            </div>
          </div>
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