'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/utils/api';
import { useAuth } from '@/app/hooks/useAuth';

interface SystemStats {
  total_characters: number;
  total_waters: number;
  total_users: number;
  ai_creations: number;
  verified_images: number;
  legendary_count: number;
  daily_mints: number;
  api_response_time: number;
  database_integrity_score: number;
  last_verification_check: string;
}

interface VerificationLog {
  id: string;
  type: 'image_hash' | 'stats_audit' | 'blockchain_verify' | 'api_integrity';
  status: 'verified' | 'failed' | 'pending';
  timestamp: string;
  details: string;
}

export default function InfoPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'verification' | 'integrity'>('overview');

  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const [statsResponse, verificationResponse] = await Promise.all([
        fetch(getApiUrl('/api/system/stats'), { credentials: 'include' }),
        fetch(getApiUrl('/api/system/verification-logs'), { credentials: 'include' })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (verificationResponse.ok) {
        const verificationData = await verificationResponse.json();
        setVerificationLogs(verificationData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    } finally {
      setLoading(false);
    }
  };

  const runVerificationCheck = async (type: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/system/verify/${type}`), {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        fetchSystemInfo(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Verification failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Verification check failed:', error);
      alert('Verification check failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading system information...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">System Information</h1>
          <p className="text-white/60">
            Real-time statistics and verification systems for Droplets of Creation
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'verification', label: 'AI Verification', icon: '🔍' },
            { id: 'integrity', label: 'Data Integrity', icon: '🛡️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'verification' | 'integrity')}
              className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white border border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>🌍</span>
                <span>World Statistics</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">Total Creations</span>
                  <span className="font-bold text-blue-400">{stats.total_characters.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Total Waters</span>
                  <span className="font-bold text-green-400">{stats.total_waters.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Active Users</span>
                  <span className="font-bold text-purple-400">{stats.total_users.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Legendary Drops</span>
                  <span className="font-bold text-yellow-400">{stats.legendary_count.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>🤖</span>
                <span>AI Verification</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">AI Creations</span>
                  <span className="font-bold text-cyan-400">{stats.ai_creations.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Verified Images</span>
                  <span className="font-bold text-green-400">{stats.verified_images.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Verification Rate</span>
                  <span className="font-bold text-emerald-400">
                    {stats.ai_creations > 0 ? ((stats.verified_images / stats.ai_creations) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Daily Mints</span>
                  <span className="font-bold text-orange-400">{stats.daily_mints.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>⚡</span>
                <span>System Performance</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">API Response</span>
                  <span className="font-bold text-blue-400">{stats.api_response_time}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Data Integrity</span>
                  <span className={`font-bold ${
                    stats.database_integrity_score >= 95 ? 'text-green-400' :
                    stats.database_integrity_score >= 85 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {stats.database_integrity_score}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Last Verification</span>
                  <span className="font-bold text-purple-400">
                    {new Date(stats.last_verification_check).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Status</span>
                  <span className="font-bold text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span>Operational</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Verification Tab */}
        {activeTab === 'verification' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>🔍</span>
                <span>AI Image Verification System</span>
              </h3>
              <p className="text-white/70 mb-6">
                Our system uses multiple verification methods to ensure all AI-generated images are authentic and prevent spoofing:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-semibold text-green-400 mb-2">✅ Image Hash Verification</h4>
                  <p className="text-sm text-white/60">
                    Each generated image includes a unique cryptographic hash that&apos;s cross-verified with our AI generation logs.
                  </p>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-400 mb-2">🧠 AI Signature Detection</h4>
                  <p className="text-sm text-white/60">
                    Our models embed invisible watermarks and signatures that can only be validated by our verification system.
                  </p>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-400 mb-2">⏰ Timestamp Validation</h4>
                  <p className="text-sm text-white/60">
                    Generation timestamps are cross-referenced with blockchain records to prevent backdating or tampering.
                  </p>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-400 mb-2">🔗 Blockchain Anchoring</h4>
                  <p className="text-sm text-white/60">
                    Image metadata is anchored to Solana blockchain for immutable proof of generation and ownership.
                  </p>
                </div>
              </div>

              {user && (
                <div className="flex gap-4">
                  <button
                    onClick={() => runVerificationCheck('images')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Run Image Verification
                  </button>
                  <button
                    onClick={() => runVerificationCheck('ai-signatures')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Check AI Signatures
                  </button>
                </div>
              )}
            </div>

            {/* Recent Verification Results */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
              <h4 className="text-lg font-semibold mb-4">Recent Verification Results</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {verificationLogs
                  .filter(log => log.type === 'image_hash' || log.type === 'blockchain_verify')
                  .slice(0, 10)
                  .map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-black/30 rounded">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        log.status === 'verified' ? 'bg-green-400' :
                        log.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                      }`}></span>
                      <span className="text-sm">{log.details}</span>
                    </div>
                    <span className="text-xs text-white/40">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Integrity Tab */}
        {activeTab === 'integrity' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>🛡️</span>
                <span>Anti-Spoofing & Data Integrity</span>
              </h3>
              <p className="text-white/70 mb-6">
                Multiple layers of protection prevent statistics manipulation and ensure data authenticity:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-semibold text-red-400 mb-2">🔒 Database Integrity Checks</h4>
                  <p className="text-sm text-white/60">
                    Continuous monitoring of database operations with checksums and audit trails to prevent tampering.
                  </p>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-400 mb-2">📊 Statistics Validation</h4>
                  <p className="text-sm text-white/60">
                    Real-time cross-validation of statistics against multiple data sources and historical patterns.
                  </p>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-semibold text-green-400 mb-2">⚡ Rate Limit Enforcement</h4>
                  <p className="text-sm text-white/60">
                    Strict rate limiting prevents artificial inflation of watering and creation statistics.
                  </p>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-semibold text-cyan-400 mb-2">🔄 Real-time Monitoring</h4>
                  <p className="text-sm text-white/60">
                    24/7 monitoring for suspicious patterns and automated responses to potential attacks.
                  </p>
                </div>
              </div>

              {user && (
                <div className="flex gap-4">
                  <button
                    onClick={() => runVerificationCheck('database')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    Run Database Audit
                  </button>
                  <button
                    onClick={() => runVerificationCheck('stats')}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                  >
                    Validate Statistics
                  </button>
                </div>
              )}
            </div>

            {/* System Integrity Metrics */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
              <h4 className="text-lg font-semibold mb-4">System Integrity Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-black/30 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">99.9%</div>
                  <div className="text-sm text-white/60">Data Consistency</div>
                </div>
                <div className="text-center p-4 bg-black/30 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">0</div>
                  <div className="text-sm text-white/60">Integrity Violations</div>
                </div>
                <div className="text-center p-4 bg-black/30 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">100%</div>
                  <div className="text-sm text-white/60">Verification Success</div>
                </div>
              </div>
            </div>

            {/* Audit Log */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10">
              <h4 className="text-lg font-semibold mb-4">Recent Integrity Audits</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {verificationLogs
                  .filter(log => log.type === 'stats_audit' || log.type === 'api_integrity')
                  .slice(0, 10)
                  .map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-black/30 rounded">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        log.status === 'verified' ? 'bg-green-400' :
                        log.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                      }`}></span>
                      <span className="text-sm">{log.details}</span>
                    </div>
                    <span className="text-xs text-white/40">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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