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
    const basePrompt = `Minimalist monochrome line art, white strokes on deep black background.
Clean vector-like outlines, smooth contours, subtle rain lines, thin ripple curves.
Subject: WATER-TYPE CREATURE born from a droplet.
No grey shading, no gradients, no color, no text, no logos. 1024x1024. High contrast.`;

    const levelPrompts = {
      1: `Level 1: simple droplet blob with tiny ${traits.eyes} eyes; ${traits.ripple_count} ripples; no accessories; cute, basic silhouette.`,
      2: `Level 2: add small ${traits.fins} fins or splash arcs; ${traits.ripple_count} ripples; ${traits.crest} crest or wave tail; slightly more segments.`,
      3: `Level 3: dynamic wave beast; ${traits.crest} crest, ${traits.foam} foam streaks as white hatching; ${traits.ripple_count} ripples; ${traits.posture} posture.`
    };

    const styleNote = `Style must match a website that uses thin white lines over a black hero background with rain-like vertical strokes.`;

    return `${basePrompt}\n\n${levelPrompts[level]}\n\n${styleNote}`;
  }

  private buildNegativePrompt(): string {
    return `color, grayscale soft shading, gradient, filled shapes, background texture, text, watermark, signature, photo, 3D, render, grey noise, low-res, blurry, realistic, photographic`;
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
    formData.append('cfg_scale', '7');
    formData.append('steps', '20');

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