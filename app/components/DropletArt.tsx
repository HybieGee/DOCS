'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface DropletArtProps {
  dropletId: string;
  level: 1 | 2 | 3 | 4 | 5;
  imageUrl?: string; // Current single image URL from database
  className?: string;
  size?: number;
}

export function DropletArt({ dropletId, level, imageUrl, className = '', size = 512 }: DropletArtProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(imageUrl || '');
  const [loading, setLoading] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // For now, use the single imageUrl if available
    // In the future, this would fetch level-specific artwork
    if (imageUrl) {
      // If we have a different image for this level, transition to it
      const leveledUrl = imageUrl; // In future: artUrl(dropletId, level)
      
      if (leveledUrl !== currentSrc) {
        // Preload the new image
        const img = new window.Image();
        img.src = leveledUrl;
        
        setLoading(true);
        img.onload = () => {
          // Trigger fade out
          setFade(true);
          
          // After fade out, swap image and fade back in
          setTimeout(() => {
            setCurrentSrc(leveledUrl);
            setFade(false);
            setLoading(false);
          }, 200); // Quick crossfade
        };
        
        img.onerror = () => {
          setLoading(false);
          console.error('Failed to load droplet art:', leveledUrl);
        };
      }
    }
  }, [dropletId, level, imageUrl, currentSrc]);

  // If no image URL, show a placeholder based on level
  if (!currentSrc) {
    return (
      <div 
        className={`bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">💧</div>
          <div className="text-white/60 text-sm">Level {level}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ width: size, height: size }}>
      {/* Loading shimmer */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer z-10" />
      )}
      
      {/* Main image with fade transition */}
      <div className={`transition-opacity duration-200 ${fade ? 'opacity-0' : 'opacity-100'}`}>
        <Image
          src={currentSrc}
          alt={`Droplet ${dropletId} Level ${level}`}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          unoptimized // For external URLs
        />
      </div>
      
      {/* Level indicator */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
        Lv.{level}
      </div>
      
      {/* Visual effects based on level */}
      {level >= 3 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent opacity-50" />
        </div>
      )}
      
      {level === 5 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 to-transparent opacity-30 animate-pulse" />
        </div>
      )}
    </div>
  );
}