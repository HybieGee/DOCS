export interface User {
  id: string;
  username: string;
  solana_address: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface Character {
  id: string;
  owner_user_id: string;
  wallet_address: string;
  name?: string;
  is_legendary: boolean;
  x: number;
  y: number;
  level: number;
  water_count: number;
  sprite_seed?: string;
  color_palette?: string;
  accessories?: string;
  created_at: string;
  updated_at: string;
  owner?: User;
  image_url?: string; // For AI-generated creation images
}

export interface Water {
  id: string;
  user_id: string;
  character_id: string;
  created_at: string;
}

export interface Lore {
  id: string;
  character_id: string;
  author_user_id: string;
  body: string;
  votes: number;
  is_canon: boolean;
  created_at: string;
  updated_at: string;
  author?: User;
}

export interface LoreVote {
  id: string;
  lore_id: string;
  voter_user_id: string;
  created_at: string;
}

export interface WorldState {
  id: number;
  total_characters: number;
  total_waters: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  last_milestone_reached: number;
  current_phase: 'dawn' | 'day' | 'dusk' | 'night';
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SignupRequest {
  username: string;
  password: string;
  solana_address: string;
  signed_message: string;
  signature: string;
  turnstile_token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface WaterRequest {
  character_id: string;
}

export interface LoreSubmission {
  body: string;
  turnstile_token: string;
}

export interface RealtimeMessage {
  type: 'character_spawn' | 'water' | 'level_up' | 'lore_canon' | 'milestone' | 'season_change';
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface Milestone {
  threshold: number;
  type: 'streams' | 'plants' | 'lights' | 'village' | 'city';
  unlocked: boolean;
}

export const EVOLUTION_THRESHOLDS = {
  level2: 3,
  level3: 10,
  level4: 25,
  level5: 50,
} as const;

export const MILESTONES: Milestone[] = [
  { threshold: 100, type: 'streams', unlocked: false },
  { threshold: 500, type: 'plants', unlocked: false },
  { threshold: 1000, type: 'lights', unlocked: false },
  { threshold: 5000, type: 'village', unlocked: false },
  { threshold: 10000, type: 'city', unlocked: false },
];

export const LEGENDARY_CHANCE = 0.01; // 1% chance
export const MAX_LORE_LENGTH = 500;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;
export const MINTS_PER_DAY_LIMIT = 5;