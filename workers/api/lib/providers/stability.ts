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
      const png = await this.callStabilityAPI(prompt, negativePrompt, seedInt);
      return { png, traits };
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

    const levelPrompts = {
      1: `Level 1: tiny water droplet with ${traits.eyes} dot eyes, ${traits.ripple_count} ripple lines, simple round shape.`,
      2: `Level 2: water droplet with ${traits.fins} fin lines, ${traits.ripple_count} ripples, ${traits.crest} wave tail.`,
      3: `Level 3: flowing water creature, ${traits.crest} crest lines, ${traits.foam} foam streaks, ${traits.ripple_count} ripples.`
    };

    const styleNote = `CRITICAL: Die-cut sticker style, isolated white line art only, completely transparent background, no box, no frame, no square background.`;

    return `${basePrompt}\n\n${levelPrompts[level]}\n\n${styleNote}`;
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
}