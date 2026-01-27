import OpenAI from 'openai';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { Platform } from '../models';

interface ImageGenerationResult {
  imageUrl: string;
  cloudinaryUrl: string;
  prompt: string;
  revisedPrompt?: string;
}

interface PlatformImageSize {
  size: '1024x1024' | '1792x1024' | '1024x1792';
  description: string;
}

export class ImageGenerationService {
  private client: OpenAI | null = null;
  private cloudinaryConfigured = false;

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OpenAI API Key is missing. Expected OPENAI_API_KEY environment variable.',
        );
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  private ensureCloudinaryConfig(): void {
    if (!this.cloudinaryConfigured) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      this.cloudinaryConfigured = true;
    }
  }

  /**
   * Get platform-specific image dimensions
   */
  private getPlatformImageSize(platform: Platform): PlatformImageSize {
    const sizes: Record<Platform, PlatformImageSize> = {
      instagram: {
        size: '1024x1024',
        description: 'Square format for Instagram feed',
      },
      linkedin: {
        size: '1792x1024',
        description: 'Landscape format for LinkedIn posts',
      },
      twitter: {
        size: '1792x1024',
        description: 'Landscape format for Twitter/X posts',
      },
      facebook: {
        size: '1792x1024',
        description: 'Landscape format for Facebook posts',
      },
    };

    return sizes[platform];
  }

  /**
   * Upload image from URL to Cloudinary
   */
  private async uploadToCloudinary(imageUrl: string): Promise<string> {
    this.ensureCloudinaryConfig();

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'ai-content-agent/generated',
      public_id: `ai-generated-${uuidv4()}`,
      resource_type: 'image',
    });

    return result.secure_url;
  }

  /**
   * Generate an image using DALL-E 3
   */
  async generateImage(
    prompt: string,
    platform: Platform,
  ): Promise<ImageGenerationResult> {
    const client = this.getClient();
    const platformSize = this.getPlatformImageSize(platform);

    console.log(`🎨 Generating image for ${platform} (${platformSize.size})...`);
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

    try {
      const response = await client.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: platformSize.size,
        quality: 'standard',
        style: 'vivid',
      });

      const imageData = response.data?.[0];
      if (!imageData?.url) {
        throw new Error('No image URL returned from DALL-E');
      }

      // Upload to Cloudinary for permanent storage
      console.log('☁️ Uploading generated image to Cloudinary...');
      const cloudinaryUrl = await this.uploadToCloudinary(imageData.url);

      console.log(`✅ Image generated and uploaded: ${cloudinaryUrl}`);

      return {
        imageUrl: imageData.url,
        cloudinaryUrl,
        prompt,
        revisedPrompt: imageData.revised_prompt,
      };
    } catch (error) {
      console.error('❌ Image generation error:', error);
      throw new Error(
        `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate an image prompt from content text
   */
  async generateImagePrompt(
    contentText: string,
    platform: Platform,
    brandContext?: string,
  ): Promise<string> {
    const client = this.getClient();

    const systemPrompt = `You are an expert at creating DALL-E 3 image prompts. Generate a detailed, visually descriptive prompt for an image that would complement social media content.

Guidelines:
- Create a photorealistic or professional illustration style
- Focus on visual elements that support the message
- Avoid text in images (DALL-E doesn't handle text well)
- Consider the platform: ${platform}
- Keep prompts clear and specific
- Maximum 400 characters`;

    const userPrompt = `Create an image prompt for this ${platform} post:

${contentText}

${brandContext ? `Brand context: ${brandContext}` : ''}

Return ONLY the image generation prompt, nothing else.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const prompt = response.choices[0]?.message?.content?.trim();
    if (!prompt) {
      throw new Error('Failed to generate image prompt');
    }

    return prompt;
  }
}

export const imageGenerationService = new ImageGenerationService();
