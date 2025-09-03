'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Character } from '@/lib/types';
import { getApiUrl } from '@/lib/utils/api';

interface CreationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function CreationsModal({ isOpen, onClose, userId }: CreationsModalProps) {
  const [userCreations, setUserCreations] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCreation, setEditingCreation] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLore, setEditLore] = useState('');

  const fetchUserCreations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/characters'), {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        // Filter to only user's creations (starts with 'cr_')
        const userCreations = data.data.filter((char: Character) => 
          char.owner_user_id === userId && char.id.startsWith('cr_')
        );
        setUserCreations(userCreations);
      }
    } catch (error) {
      console.error('Failed to fetch user creations:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserCreations();
    }
  }, [isOpen, userId, fetchUserCreations]);

  const handleEditClick = (creation: Character) => {
    setEditingCreation(creation.id);
    setEditName(creation.name || `Creation ${creation.id.slice(-4)}`);
    setEditLore(''); // Will fetch existing lore later
  };

  const handleSaveEdit = async () => {
    if (!editingCreation) return;
    
    try {
      // Update name
      if (editName.trim()) {
        const response = await fetch(getApiUrl(`/api/creations/${editingCreation}/name`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: editName.trim() })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update name');
        }
      }

      // Update lore (if provided)
      if (editLore.trim()) {
        try {
          const response = await fetch(getApiUrl(`/api/lore/characters/${editingCreation}/lore`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
              body: editLore.trim()
            })
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Failed to update lore:', error.error);
            alert(`Failed to add lore: ${error.error}`);
          } else {
            console.log('Lore added successfully');
          }
        } catch (err) {
          console.error('Failed to update lore:', err);
          alert('Failed to add lore. Please try again.');
        }
      }
      
      // Success - close edit mode and refresh
      setEditingCreation(null);
      setEditName('');
      setEditLore('');
      await fetchUserCreations();
      
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert(error instanceof Error ? error.message : 'Failed to save changes');
    }
  };

  const handleCancelEdit = () => {
    setEditingCreation(null);
    setEditName('');
    setEditLore('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-white/20 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-medium">Your Creations</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-white/60 text-center py-8">Loading your creations...</div>
        ) : userCreations.length === 0 ? (
          <div className="text-white/60 text-center py-8">
            <div>You haven&apos;t created any droplets yet.</div>
            <div className="text-sm mt-2">Click &quot;Mint Today&apos;s Droplet&quot; to create one!</div>
          </div>
        ) : (
          <div className="space-y-4">
            {userCreations.map((creation) => (
              <div key={creation.id} className="bg-gray-800 border border-white/10 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {creation.image_url && (
                      <img
                        src={creation.image_url}
                        alt={creation.name || 'Creation'}
                        className="w-16 h-16 rounded-lg bg-white/10"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      {editingCreation === creation.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-gray-700 text-white border border-white/20 rounded px-2 py-1 text-sm"
                          placeholder="Creation name"
                        />
                      ) : (
                        <h3 className="text-white font-medium">
                          {creation.name || `Creation ${creation.id.slice(-4)}`}
                        </h3>
                      )}
                      <div className="text-white/60 text-xs mt-1">
                        Level {creation.level} • {creation.is_legendary ? '👑 Legendary' : '💧 Common'} • Created {new Date(creation.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-white/40 text-xs">
                        ID: {creation.id}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {editingCreation === creation.id ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="text-green-400 hover:text-green-300 text-xs px-2 py-1 border border-green-400/40 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-white/60 hover:text-white text-xs px-2 py-1 border border-white/20 rounded"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEditClick(creation)}
                        className="text-white/60 hover:text-white text-xs px-2 py-1 border border-white/20 rounded"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {editingCreation === creation.id && (
                  <div className="mt-4">
                    <label className="text-white/80 text-sm block mb-2">Lore Description:</label>
                    <textarea
                      value={editLore}
                      onChange={(e) => setEditLore(e.target.value)}
                      className="bg-gray-700 text-white border border-white/20 rounded px-3 py-2 w-full text-sm resize-none"
                      rows={3}
                      placeholder="Add lore for your creation..."
                    />
                    <div className="text-white/40 text-xs mt-1">
                      {editLore.length}/500 characters
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}