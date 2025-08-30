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

// Deterministic trait generation based on seed and level
export function deriveTraits(seed: string, level: 1 | 2 | 3): Record<string, any> {
  // Use seed for deterministic randomness
  const hash = Array.from(seed).reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  const rng = (offset: number) => Math.abs(hash + offset) % 100;

  const baseTraits = {
    type: "water",
    level,
    form: level === 1 ? "droplet" : level === 2 ? "stream" : "wave",
    eyes: ["dot", "sparkle", "ripple"][rng(1) % (level === 1 ? 1 : level === 2 ? 2 : 3)],
    ripple_count: level + (rng(2) % 2),
  };

  // Add level-specific traits
  if (level >= 2) {
    baseTraits["fins"] = ["small", "curved", "splash"][rng(3) % 3];
    baseTraits["crest"] = rng(4) % 2 === 0 ? "small" : "none";
  }

  if (level >= 3) {
    baseTraits["crest"] = ["pronounced", "flowing", "heroic"][rng(5) % 3];
    baseTraits["foam"] = rng(6) % 2 === 0 ? "hatched" : "streaked";
    baseTraits["posture"] = ["heroic", "dynamic", "majestic"][rng(7) % 3];
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
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
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