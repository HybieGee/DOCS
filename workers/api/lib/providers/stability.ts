import { ImageProvider, GenInput, GenOutput, deriveTraits, seedToInt, b64ToArrayBuffer } from '../genImage';

export class StabilityProvider implements ImageProvider {
  constructor(private apiKey: string) {}

  async generate(input: GenInput): Promise<GenOutput> {
    const { seed, level } = input;
    const seedInt = seedToInt(seed);
    const traits = deriveTraits(seed, level);
    
    const prompt = this.buildPrompt(level, traits);
    const negativePrompt = this.buildNegativePrompt();
    
    try {
      // First generate the image
      const png = await this.callStabilityAPI(prompt, negativePrompt, seedInt);
      
      // Then remove the background
      const transparentPng = await this.removeBackground(png);
      
      return { png: transparentPng, traits };
    } catch (error) {
      console.error('Stability AI error:', error);
      throw new Error(`Image generation failed: ${error}`);
    }
  }

  private buildPrompt(level: 1 | 2 | 3, traits: Record<string, any>): string {
    const basePrompt = `STICKER, DIE-CUT STICKER, isolated object, no background, cutout.
White line art creature only, thin white outlines, minimalist design.
Subject: Simple WATER DROPLET CREATURE made of white lines.
Isolated on transparent, PNG cutout, sticker format, no square, no frame.`;

    // Add unique variation elements to ensure no duplicates
    const uniqueElements = this.getUniqueElements(traits);
    
    const levelPrompts = {
      1: `Level 1: tiny water droplet with ${traits.eyes} dot eyes, ${traits.ripple_count} ripple lines, simple round shape, ${uniqueElements.detail}.`,
      2: `Level 2: water droplet with ${traits.fins} fin lines, ${traits.ripple_count} ripples, ${traits.crest} wave tail, ${uniqueElements.feature}.`,
      3: `Level 3: flowing water creature, ${traits.crest} crest lines, ${traits.foam} foam streaks, ${traits.ripple_count} ripples, ${uniqueElements.accent}.`
    };

    const styleNote = `CRITICAL: Die-cut sticker style, isolated white line art only, completely transparent background, no box, no frame, no square background.`;

    return `${basePrompt}\n\n${levelPrompts[level]}\n\n${styleNote}`;
  }

  private getUniqueElements(traits: Record<string, any>): Record<string, string> {
    // Generate unique visual elements based on traits to ensure no duplicates
    const hash = Object.values(traits).join('').length;
    const rng = (offset: number) => Math.abs(hash + offset) % 10;
    
    const details = ["subtle highlights", "soft shadows", "curved edges", "smooth lines", "gentle curves"];
    const features = ["flowing motion", "dynamic splash", "elegant curves", "graceful form", "fluid movement"];
    const accents = ["dramatic waves", "majestic presence", "heroic stance", "powerful flow", "commanding aura"];
    
    return {
      detail: details[rng(1) % details.length],
      feature: features[rng(2) % features.length], 
      accent: accents[rng(3) % accents.length]
    };
  }

  private buildNegativePrompt(): string {
    return `background, black background, white background, grey background, any background color, filled background, square, rectangle, frame, border, box, color, gradient, shading, filled shapes, solid shapes, photo, 3D, realistic`;
  }

  private async callStabilityAPI(prompt: string, negativePrompt: string, seedInt: number): Promise<ArrayBuffer> {
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('negative_prompt', negativePrompt);
    formData.append('seed', seedInt.toString());
    formData.append('width', '1024');
    formData.append('height', '1024');
    formData.append('output_format', 'png');
    formData.append('cfg_scale', '10'); // Higher guidance for better prompt following
    formData.append('steps', '30'); // More steps for better quality

    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
        // Don't set Content-Type - let FormData set it automatically
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stability API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    
    // Handle different response formats
    const base64Image = result.image || result.images?.[0]?.b64 || result.images?.[0]?.image;
    
    if (!base64Image) {
      throw new Error('No image data in Stability API response');
    }

    return b64ToArrayBuffer(base64Image);
  }

  private async removeBackground(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      console.log('Removing background from generated image...');
      
      // Create FormData for the background removal request
      const formData = new FormData();
      
      // Convert ArrayBuffer to Blob for FormData
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      formData.append('image', blob, 'image.png');
      formData.append('output_format', 'png');
      
      const response = await fetch('https://api.stability.ai/v2beta/stable-image/edit/remove-background', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Background removal failed:', error);
        // If background removal fails, return original image
        return imageBuffer;
      }

      const result = await response.json();
      
      // Handle different response formats
      const base64Image = result.image || result.images?.[0]?.b64 || result.images?.[0]?.image;
      
      if (!base64Image) {
        console.error('No image in background removal response');
        return imageBuffer;
      }

      console.log('Background removed successfully');
      return b64ToArrayBuffer(base64Image);
    } catch (error) {
      console.error('Background removal error:', error);
      // Return original image if removal fails
      return imageBuffer;
    }
  }
}