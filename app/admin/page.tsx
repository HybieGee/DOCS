'use client';

import { useState } from 'react';
import { getApiUrl } from '@/lib/utils/api';

export default function AdminPage() {
  const [isFixing, setIsFixing] = useState(false);
  const [status, setStatus] = useState<{
    total_characters: number;
    overlapping_pairs: number;
    min_distance_required: number;
    overlaps: Array<{ char1: string; char2: string; distance: number }>;
  } | null>(null);
  const [message, setMessage] = useState('');

  const checkStatus = async () => {
    try {
      const response = await fetch(getApiUrl('/api/system/overlap-status'));
      const data = await response.json();
      setStatus(data.data);
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const fixPositions = async () => {
    setIsFixing(true);
    setMessage('');
    
    try {
      const response = await fetch(getApiUrl('/api/world/fix-overlaps'), {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ All character positions have been fixed! No more overlaps.');
        // Refresh status
        await checkStatus();
      } else {
        setMessage('❌ Failed to fix positions: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to fix positions:', error);
      setMessage('❌ Error occurred while fixing positions');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔧 Admin Panel</h1>
        
        {/* Position Status */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10 mb-6">
          <h2 className="text-xl font-semibold mb-4">Droplet Position Status</h2>
          
          <button
            onClick={checkStatus}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white mb-4"
          >
            Check Current Status
          </button>
          
          {status && (
            <div className="space-y-2">
              <div>Total Characters: <strong>{status.total_characters}</strong></div>
              <div>Overlapping Pairs: <strong className={status.overlapping_pairs > 0 ? 'text-red-400' : 'text-green-400'}>
                {status.overlapping_pairs}
              </strong></div>
              <div>Min Distance Required: <strong>{status.min_distance_required}px</strong></div>
              
              {status.overlaps && status.overlaps.length > 0 && (
                <div className="mt-4">
                  <div className="text-red-400 font-semibold">Sample Overlaps:</div>
                  <div className="text-sm text-white/70 max-h-32 overflow-y-auto">
                    {status.overlaps.map((overlap, i: number) => (
                      <div key={i}>
                        {overlap.char1} ↔ {overlap.char2} (distance: {overlap.distance}px)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Fix Positions */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border border-white/10 mb-6">
          <h2 className="text-xl font-semibold mb-4">Fix Overlapping Positions</h2>
          <p className="text-white/70 mb-4">
            This will redistribute all existing characters to ensure they don&apos;t overlap with each other.
            Minimum distance between droplets will be 80px.
          </p>
          
          <button
            onClick={fixPositions}
            disabled={isFixing}
            className={`px-6 py-3 rounded-lg font-medium ${
              isFixing 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isFixing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Redistributing Positions...
              </div>
            ) : (
              '🔧 Fix All Overlapping Positions'
            )}
          </button>
          
          {message && (
            <div className="mt-4 p-3 rounded-lg bg-black/30 border border-white/20">
              {message}
            </div>
          )}
        </div>
        
        {/* Back to Game */}
        <div className="text-center">
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