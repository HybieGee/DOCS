'use client';

import { useState } from 'react';

export default function HowItWorksPage() {
  const [activeSection, setActiveSection] = useState<'overview' | 'earning' | 'rewards' | 'levels'>('overview');

  return (
    <div className="h-screen bg-black text-white overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 gradient-text">How $DROPLET Works</h1>
          <p className="text-white/60 text-lg">
            Learn about the $DROPLET token economy and how to maximize your earnings
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-4 mb-8">
          {(['overview', 'earning', 'rewards', 'levels'] as const).map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-6 py-3 rounded-lg transition-all capitalize ${
                activeSection === section
                  ? 'bg-white/20 text-white border border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {section}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
                <h2 className="text-2xl font-semibold mb-4">💧 What is $DROPLET?</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  $DROPLET is the native token of the Droplets of Creation ecosystem. It rewards active participants
                  who contribute to the growth and nurturing of the digital creatures in our world.
                </p>
                <div className="bg-black/30 rounded-lg p-4 border border-blue-500/20">
                  <h3 className="font-semibold text-blue-400 mb-2">Key Features:</h3>
                  <ul className="space-y-2 text-white/70">
                    <li>• Daily earning cap of 7,500 $DROPLET per user</li>
                    <li>• Multiple earning mechanisms to reward different activities</li>
                    <li>• Level-based multipliers for enhanced rewards</li>
                    <li>• Community-driven economy with voting rewards</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
                <h2 className="text-2xl font-semibold mb-4">🎯 Getting Started</h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="text-3xl">1️⃣</div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Mint Your Daily Droplet</h3>
                      <p className="text-white/70">Create one unique droplet per day. Legendary droplets (rare) earn bonus rewards!</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-3xl">2️⃣</div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Water Other Droplets</h3>
                      <p className="text-white/70">Help other droplets grow by watering them (max 3 per hour)</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-3xl">3️⃣</div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Participate in Voting</h3>
                      <p className="text-white/70">Vote on community lore to earn additional rewards</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'earning' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
                <h2 className="text-2xl font-semibold mb-4">💰 Earning Mechanisms</h2>
                
                <div className="space-y-6">
                  <div className="bg-black/30 rounded-lg p-4 border border-green-500/20">
                    <h3 className="font-semibold text-green-400 text-lg mb-3">Daily Minting Rewards</h3>
                    <div className="space-y-2 text-white/80">
                      <div className="flex justify-between">
                        <span>Common Droplet:</span>
                        <span className="font-bold">500 $DROPLET</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Legendary Droplet:</span>
                        <span className="font-bold text-yellow-400">2,500 $DROPLET</span>
                      </div>
                      <div className="text-sm text-white/60 mt-2">
                        * 5% chance for legendary droplet
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4 border border-blue-500/20">
                    <h3 className="font-semibold text-blue-400 text-lg mb-3">Watering Rewards</h3>
                    <div className="space-y-2 text-white/80">
                      <div className="flex justify-between">
                        <span>Per Water:</span>
                        <span className="font-bold">100 $DROPLET</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Waters/Hour:</span>
                        <span className="font-bold">3</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Potential:</span>
                        <span className="font-bold">7,200 $DROPLET</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4 border border-purple-500/20">
                    <h3 className="font-semibold text-purple-400 text-lg mb-3">Passive Holding Rewards</h3>
                    <div className="space-y-2 text-white/80">
                      <div className="flex justify-between">
                        <span>Level 1 Droplet:</span>
                        <span className="font-bold">10 $DROPLET/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 2 Droplet:</span>
                        <span className="font-bold">25 $DROPLET/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 3 Droplet:</span>
                        <span className="font-bold">50 $DROPLET/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 4 Droplet:</span>
                        <span className="font-bold">100 $DROPLET/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 5 Droplet:</span>
                        <span className="font-bold">200 $DROPLET/day</span>
                      </div>
                      <div className="text-sm text-white/60 mt-2">
                        * Legendary droplets earn 2x passive rewards
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4 border border-orange-500/20">
                    <h3 className="font-semibold text-orange-400 text-lg mb-3">Voting Rewards</h3>
                    <div className="space-y-2 text-white/80">
                      <div className="flex justify-between">
                        <span>Per Vote Cast:</span>
                        <span className="font-bold">50 $DROPLET</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Votes/Hour:</span>
                        <span className="font-bold">3</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quality Vote Bonus:</span>
                        <span className="font-bold">+25 $DROPLET</span>
                      </div>
                      <div className="text-sm text-white/60 mt-2">
                        * Quality bonus when your vote aligns with majority
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 rounded-lg p-6 border border-yellow-500/30">
                <h3 className="font-semibold text-yellow-400 text-lg mb-3">⚠️ Daily Cap</h3>
                <p className="text-white/80">
                  Maximum earnings are capped at <span className="font-bold text-yellow-400">7,500 $DROPLET</span> per day
                  to ensure fair distribution and sustainable tokenomics.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'rewards' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
                <h2 className="text-2xl font-semibold mb-4">🎁 Special Rewards & Bonuses</h2>
                
                <div className="space-y-4">
                  <div className="bg-black/30 rounded-lg p-4 border border-cyan-500/20">
                    <h3 className="font-semibold text-cyan-400 mb-2">Community Milestones</h3>
                    <ul className="space-y-2 text-white/80">
                      <li>• 1,000 total droplets: All users earn 100 bonus $DROPLET</li>
                      <li>• 10,000 total waters: 2x earning multiplier for 24 hours</li>
                      <li>• 100 legendary droplets: Special airdrop to all holders</li>
                    </ul>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4 border border-pink-500/20">
                    <h3 className="font-semibold text-pink-400 mb-2">Streak Bonuses</h3>
                    <ul className="space-y-2 text-white/80">
                      <li>• 7-day streak: +10% earning bonus</li>
                      <li>• 30-day streak: +25% earning bonus</li>
                      <li>• 100-day streak: +50% earning bonus</li>
                    </ul>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4 border border-emerald-500/20">
                    <h3 className="font-semibold text-emerald-400 mb-2">Social Rewards</h3>
                    <ul className="space-y-2 text-white/80">
                      <li>• Receive 10+ waters on your droplet: 200 $DROPLET bonus</li>
                      <li>• Top lore contributor: 500 $DROPLET daily bonus</li>
                      <li>• Most helpful voter: 300 $DROPLET daily bonus</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'levels' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
                <h2 className="text-2xl font-semibold mb-4">📈 Droplet Evolution & Levels</h2>
                
                <div className="space-y-4">
                  <p className="text-white/80 leading-relaxed">
                    Droplets evolve through 5 levels based on the water they receive from the community.
                    Higher level droplets provide better passive rewards and unlock special features.
                  </p>

                  <div className="bg-black/30 rounded-lg p-4 border border-blue-500/20">
                    <h3 className="font-semibold text-blue-400 mb-3">Evolution Thresholds</h3>
                    <div className="space-y-2 text-white/80">
                      <div className="flex justify-between">
                        <span>Level 1 → 2:</span>
                        <span className="font-bold">3 waters</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 2 → 3:</span>
                        <span className="font-bold">10 waters</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 3 → 4:</span>
                        <span className="font-bold">25 waters</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 4 → 5:</span>
                        <span className="font-bold">50 waters</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4 border border-purple-500/20">
                    <h3 className="font-semibold text-purple-400 mb-3">Level Benefits</h3>
                    <div className="space-y-3 text-white/80">
                      <div>
                        <div className="font-semibold text-white">Level 1</div>
                        <div className="text-sm">Basic droplet • 10 $DROPLET/day</div>
                      </div>
                      <div>
                        <div className="font-semibold text-white">Level 2</div>
                        <div className="text-sm">Evolved droplet • 25 $DROPLET/day • Unlock custom name</div>
                      </div>
                      <div>
                        <div className="font-semibold text-white">Level 3</div>
                        <div className="text-sm">Advanced droplet • 50 $DROPLET/day • Unlock lore writing</div>
                      </div>
                      <div>
                        <div className="font-semibold text-white">Level 4</div>
                        <div className="text-sm">Master droplet • 100 $DROPLET/day • Special visual effects</div>
                      </div>
                      <div>
                        <div className="font-semibold text-white">Level 5</div>
                        <div className="text-sm">Legendary status • 200 $DROPLET/day • Exclusive rewards</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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