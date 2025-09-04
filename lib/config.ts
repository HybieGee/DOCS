/**
 * DROPLETS OF CREATION - CONFIGURATION FILE
 * Update these values for easy maintenance
 */

export const CONFIG = {
  // CONTRACT ADDRESS - Update this when you launch!
  CONTRACT_ADDRESS: '8ePxrg4ywm9ivgw2AEZTZoGVWkKyxiHHaR3Txa1Bpump', // Replace with actual CA like "7xYz...abc123"
  
  // Token Info
  TOKEN: {
    SYMBOL: '$DROPLET',
    NAME: 'Droplets of Creation',
    DECIMALS: 9,
  },
  
  // Social Links
  SOCIALS: {
    TWITTER: 'https://twitter.com/DropletsCreation',
    TELEGRAM: 'https://t.me/dropletsofcreation',
    DISCORD: '',
    WEBSITE: 'https://dropletsofcreation.com',
  },
  
  // Network
  NETWORK: {
    CHAIN: 'Solana',
    RPC: 'https://api.mainnet-beta.solana.com',
    EXPLORER: 'https://solscan.io',
  },
  
  // Game Settings
  GAME: {
    MIN_DROPLET_DISTANCE: 80, // Minimum pixels between droplets
    WORLD_WIDTH: 1920,
    WORLD_HEIGHT: 200,
    GROUND_Y_START: 600,
    LEGENDARY_CHANCE: 0.05, // 5% chance
    MINTS_PER_DAY: 1,
  },

  // Seasonal Content
  SEASONAL: {
    ENABLED: true,
    CURRENT_SEASON: 'winter', // 'spring', 'summer', 'autumn', 'winter'
    HOLIDAY_MODE: true, // Enables special holiday themes
    SEASONAL_DROPLET_CHANCE: 0.15, // 15% chance for seasonal themed droplets
    WINTER_THEMES: ['snowflake', 'icicle', 'frost', 'winter-crystal'],
    SPECIAL_EVENT_ACTIVE: false,
  },

  // Referral System
  REFERRALS: {
    ENABLED: true,
    REFERRER_BONUS: 1000, // $DROPLET bonus for referrer
    REFEREE_BONUS: 500,   // $DROPLET bonus for new user
    DAILY_REFERRAL_LIMIT: 10, // Max referrals per day
    BONUS_MULTIPLIER: 1.1, // 10% bonus for referred users
    MIN_ACTIVITY_REQUIRED: true, // Referee must create a droplet
  },
  
  // Token Economy
  ECONOMY: {
    DAILY_MINT_REWARD: 500,
    LEGENDARY_MINT_BONUS: 2000,
    WATER_REWARD: 100,
    VOTE_REWARD: 50,
    QUEST_MULTIPLIER: 1,
    AUTO_EARN_BASE: 3, // tokens per 30 seconds
  },
  
  // Feature Flags
  FEATURES: {
    TRADING_ENABLED: false,
    MARKETPLACE_ENABLED: false,
    BREEDING_ENABLED: false,
    TOURNAMENTS_ENABLED: false,
    SOCIAL_ENABLED: true,
  },
  
  // API Endpoints
  API: {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://droplets-api.stealthbundlebot.workers.dev',
  },
};

// Export individual configs for convenience
export const CA = CONFIG.CONTRACT_ADDRESS;
export const TOKEN_SYMBOL = CONFIG.TOKEN.SYMBOL;
export const MIN_DISTANCE = CONFIG.GAME.MIN_DROPLET_DISTANCE;
