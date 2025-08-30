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
  const animationRef = useRef<number>();

  const drawPlant = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = 'rgba(34, 139, 34, 0.8)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y - 20);
    ctx.lineTo(x + 5, y - 20);
    ctx.closePath();
    ctx.fill();
  }, []);

  const drawWorldBackground = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, state: { total_characters: number }) => {
    // Draw ground
    const gradient = ctx.createLinearGradient(0, canvas.height - 200, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(34, 139, 34, 0.3)');
    gradient.addColorStop(1, 'rgba(34, 139, 34, 0.6)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - 200, canvas.width, 200);

    // Draw milestone-based elements
    if (state.total_characters >= 100) {
      // Draw streams
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(100, canvas.height - 150);
      ctx.quadraticCurveTo(200, canvas.height - 170, 300, canvas.height - 150);
      ctx.stroke();
    }

    if (state.total_characters >= 500) {
      // Draw plants
      for (let i = 0; i < 10; i++) {
        const x = (canvas.width / 10) * i + 50;
        const y = canvas.height - 180;
        drawPlant(ctx, x, y);
      }
    }

    if (state.total_characters >= 1000) {
      // Draw town lights
      for (let i = 0; i < 5; i++) {
        const x = (canvas.width / 5) * i + 100;
        const y = canvas.height - 300;
        ctx.fillStyle = 'rgba(255, 255, 100, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [drawPlant]);

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
      drawWorldBackground(ctx, canvas, worldState);

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


  const drawCharacter = (ctx: CanvasRenderingContext2D, character: Character) => {
    const colors = character.color_palette ? JSON.parse(character.color_palette) : { primary: '#4A90E2' };
    
    // Character position
    const x = character.x;
    const y = character.y;
    const size = 10 + character.level * 5;

    // Draw character droplet
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
      const size = 10 + char.level * 5;
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
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
      />
      
      {/* Season/Time Overlay */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
        <div className="text-white text-sm">
          <span className="capitalize">{worldState.season}</span> • <span className="capitalize">{worldState.current_phase}</span>
        </div>
      </div>
    </div>
  );
}