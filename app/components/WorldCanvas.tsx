'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Character } from '@/lib/types';

interface WorldCanvasProps {
  characters: Character[];
  worldState: {
    total_characters: number;
    season: string;
    current_phase: string;
  };
  onCharacterClick: (character: Character) => void;
}

export function WorldCanvas({ characters, worldState, onCharacterClick }: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const drawWorldBackground = useCallback(() => {
    // No background drawing - let the video background show through
    // Characters will float freely in the space
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw world background elements based on milestones
      drawWorldBackground();

      // Draw characters
      characters.forEach((character) => {
        drawCharacter(ctx, character);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [characters, worldState, drawWorldBackground]);


  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const loadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  const drawCharacter = (ctx: CanvasRenderingContext2D, character: Character) => {
    const x = character.x;
    const y = character.y;
    const baseSize = 40 + character.level * 20; // Larger size for images
    
    // If character has an image_url, try to draw the actual AI image
    if (character.image_url) {
      const cachedImage = imageCache.current.get(character.id);
      
      if (cachedImage) {
        // Draw the actual AI-generated image
        const imageSize = baseSize;
        ctx.drawImage(
          cachedImage,
          x - imageSize / 2,
          y - imageSize / 2,
          imageSize,
          imageSize
        );
        
        // Add level indicator
        if (character.level > 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`Lv${character.level}`, x, y + baseSize / 2 + 15);
        }
        
        // Add legendary border
        if (character.is_legendary) {
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.rect(x - imageSize / 2 - 2, y - imageSize / 2 - 2, imageSize + 4, imageSize + 4);
          ctx.stroke();
        }
        
        return;
      } else {
        // Try to load the image - don't draw fallback dot, just wait
        loadImage(character.image_url)
          .then(img => {
            imageCache.current.set(character.id, img);
          })
          .catch(err => {
            console.error(`Failed to load image for character ${character.id}:`, err);
            // Only on error, draw the fallback dot
            drawFallbackDot(ctx, character, x, y);
          });
        // Return without drawing anything while loading
        return;
      }
    }
    
    // Draw fallback dot for characters without images
    drawFallbackDot(ctx, character, x, y);
  };

  const drawFallbackDot = (ctx: CanvasRenderingContext2D, character: Character, x: number, y: number) => {
    const colors = character.color_palette ? JSON.parse(character.color_palette) : { primary: '#FFFFFF' };
    const size = 10 + character.level * 5;

    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Draw glow for higher levels
    if (character.level >= 3) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = colors.primary;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw legendary particle effect
    if (character.is_legendary) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, size + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  };


  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked character
    const clickedCharacter = characters.find((char) => {
      const distance = Math.sqrt(Math.pow(char.x - x, 2) + Math.pow(char.y - y, 2));
      // Use appropriate size based on whether character has an image
      const size = char.image_url ? (40 + char.level * 20) / 2 : (10 + char.level * 5);
      return distance <= size;
    });

    if (clickedCharacter) {
      onCharacterClick(clickedCharacter);
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer bg-transparent"
        onClick={handleCanvasClick}
      />
    </div>
  );
}