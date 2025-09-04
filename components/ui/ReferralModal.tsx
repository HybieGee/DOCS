'use client';
import { useState, useEffect } from 'react';
import { X, Copy, Users, Gift, ExternalLink } from 'lucide-react';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface ReferralStats {
  referralCode: string | null;
  stats: {
    totalReferrals: number;
    completedReferrals: number;
    totalEarned: number;
    codeUsesLeft: number;
  };
  recentReferrals: Array<{
    id: string;
    referee_username: string;
    activity_completed: boolean;
    created_at: string;
    referrer_bonus: number;
  }>;
}

export default function ReferralModal({ isOpen, onClose, userId }: ReferralModalProps) {
  const [referralData, setReferralData] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      loadReferralData();
    }
  }, [isOpen, userId]);

  const loadReferralData = async () => {
    setLoading(true);
    try {
      // Generate referral code if user doesn't have one
      await fetch(`/api/referrals/generate-code/${userId}`, { method: 'POST' });
      
      // Get referral stats
      const response = await fetch(`/api/referrals/stats/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setReferralData(data);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!referralData?.referralCode) return;
    
    const referralUrl = `${window.location.origin}?ref=${referralData.referralCode}`;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopyMessage('Copied to clipboard!');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopyMessage('Failed to copy');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-blue-500/20 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Referral System
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading referral data...</p>
          </div>
        ) : referralData ? (
          <div className="space-y-6">
            {/* Referral Code Section */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Gift size={20} />
                Your Referral Code
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <code className="bg-gray-700 px-4 py-2 rounded-lg text-cyan-400 font-mono text-lg flex-1">
                  {referralData.referralCode}
                </code>
                <button
                  onClick={copyReferralLink}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Copy size={16} />
                  Copy Link
                </button>
              </div>
              {copyMessage && (
                <p className="text-green-400 text-sm">{copyMessage}</p>
              )}
              <div className="text-sm text-gray-400">
                <p>Share your referral link to invite friends!</p>
                <p className="mt-1">
                  • Friends get <span className="text-cyan-400 font-semibold">500 $DROPLET</span> when they join
                </p>
                <p>
                  • You get <span className="text-cyan-400 font-semibold">1000 $DROPLET</span> when they create their first droplet
                </p>
                <p>
                  • Uses left: <span className="text-yellow-400 font-semibold">{referralData.stats.codeUsesLeft}</span>
                </p>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{referralData.stats.totalReferrals}</p>
                <p className="text-sm text-gray-400">Total Referrals</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
                <Gift className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{referralData.stats.completedReferrals}</p>
                <p className="text-sm text-gray-400">Active Referrals</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
                <div className="w-8 h-8 text-cyan-400 mx-auto mb-2 flex items-center justify-center font-bold">$</div>
                <p className="text-2xl font-bold text-white">{referralData.stats.totalEarned.toLocaleString()}</p>
                <p className="text-sm text-gray-400">$DROPLET Earned</p>
              </div>
            </div>

            {/* Recent Referrals */}
            {referralData.recentReferrals.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-blue-400 mb-4">Recent Referrals</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {referralData.recentReferrals.map((referral) => (
                    <div key={referral.id} className="flex justify-between items-center py-2 border-b border-gray-700/30 last:border-0">
                      <div>
                        <p className="text-white font-medium">{referral.referee_username}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {referral.activity_completed ? (
                          <span className="text-green-400 text-sm">
                            +{referral.referrer_bonus} $DROPLET
                          </span>
                        ) : (
                          <span className="text-yellow-400 text-sm">
                            Pending activity
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-500/20">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">How Referrals Work</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>1. Share your referral link with friends</p>
                <p>2. When they sign up using your link, they get 500 $DROPLET instantly</p>
                <p>3. When they create their first droplet, you earn 1000 $DROPLET</p>
                <p>4. Your friend gets a 10% bonus on all future earnings!</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">Failed to load referral data</p>
            <button
              onClick={loadReferralData}
              className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}