export type GenInput = {
  seed: string;
  level: 1 | 2 | 3;
  size?: "1024x1024";
};

export type GenOutput = {
  png: ArrayBuffer;
  traits: Record<string, any>;
};

export interface ImageProvider {
  generate(input: GenInput): Promise<GenOutput>;
}

// Enhanced trait generation with seasonal support
export function deriveTraits(seed: string, level: 1 | 2 | 3, seasonalTheme?: string): Record<string, any> {
  // Use seed for deterministic randomness
  const hash = Array.from(seed).reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  const rng = (offset: number) => Math.abs(hash + offset) % 100;

  const baseTraits: Record<string, any> = {
    type: "water",
    level,
    form: level === 1 ? "droplet" : level === 2 ? "stream" : "wave",
    eyes: ["dot", "sparkle", "ripple"][rng(1) % (level === 1 ? 1 : level === 2 ? 2 : 3)],
    ripple_count: level + (rng(2) % 3), // More ripple variation
    // Add unique identifier elements
    droplet_size: ["tiny", "small", "medium"][rng(8) % 3],
    surface_texture: ["smooth", "bubbly", "crystalline"][rng(9) % 3],
    edge_style: ["rounded", "pointed", "wavy"][rng(10) % 3],
    // Seasonal theme
    seasonal_theme: seasonalTheme || null,
    is_seasonal: !!seasonalTheme,
  };

  // Add seasonal-specific traits
  if (seasonalTheme) {
    switch (seasonalTheme) {
      case 'snowflake':
        baseTraits.special_pattern = 'crystalline_branches';
        baseTraits.frost_effect = true;
        baseTraits.winter_sparkle = rng(13) % 2 === 0;
        break;
      case 'icicle':
        baseTraits.special_pattern = 'sharp_edges';
        baseTraits.ice_texture = true;
        baseTraits.frozen_core = true;
        break;
      case 'frost':
        baseTraits.special_pattern = 'frost_coating';
        baseTraits.misty_aura = true;
        baseTraits.cold_shimmer = rng(14) % 2 === 0;
        break;
      case 'winter-crystal':
        baseTraits.special_pattern = 'faceted_surface';
        baseTraits.prismatic_effect = true;
        baseTraits.aurora_glow = rng(15) % 2 === 0;
        break;
    }
  }

  // Add level-specific traits with more variation
  if (level >= 2) {
    baseTraits.fins = ["small", "curved", "splash", "flowing", "pointed"][rng(3) % 5];
    baseTraits.crest = ["small", "none", "wavy", "peaked"][rng(4) % 4];
    baseTraits.motion_lines = ["straight", "curved", "spiral"][rng(11) % 3];
  }

  if (level >= 3) {
    baseTraits.crest = ["pronounced", "flowing", "heroic", "majestic", "towering"][rng(5) % 5];
    baseTraits.foam = ["hatched", "streaked", "dotted", "swirled"][rng(6) % 4];
    baseTraits.posture = ["heroic", "dynamic", "majestic", "regal", "commanding"][rng(7) % 5];
    baseTraits.aura_lines = ["radial", "spiral", "wave", "burst"][rng(12) % 4];
  }

  return baseTraits;
}

// Convert hex seed to integer for Stability AI
export function seedToInt(seed: string): number {
  return Number.parseInt(seed.slice(0, 8), 16);
}

// Generate SHA-256 hex from input
export async function generateSeed(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Convert base64 to ArrayBuffer
export function b64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}