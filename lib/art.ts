// Art utilities for level-based artwork

/**
 * Get the artwork URL for a droplet at a specific level
 * Returns URLs for level-based artwork stored in character's image URLs
 */
export function artUrl(dropletId: string, level: 1 | 2 | 3 | 4 | 5): string {
  // For AI-generated droplets, we assume the artwork URLs are stored
  // in the database with the level appended
  // This would need to be implemented in your image generation flow
  return `/api/droplets/${dropletId}/art/${level}`;
}

/**
 * Get all artwork URLs for a droplet (all 5 levels)
 */
export function getAllArtUrls(dropletId: string): string[] {
  return [1, 2, 3, 4, 5].map(level => artUrl(dropletId, level as 1 | 2 | 3 | 4 | 5));
}

/**
 * Check if artwork is ready for a droplet at a specific level
 */
export async function isArtReady(dropletId: string, level: number): Promise<boolean> {
  try {
    const url = artUrl(dropletId, level as 1 | 2 | 3 | 4 | 5);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}