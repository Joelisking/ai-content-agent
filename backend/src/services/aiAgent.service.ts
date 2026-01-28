import Anthropic from '@anthropic-ai/sdk';
import { IBrandConfig, IMediaUpload, Platform } from '../models';
import { imageGenerationService } from './imageGeneration.service';

interface ContentGenerationRequest {
  brandConfig: IBrandConfig;
  platform: Platform;
  mediaContext?: string;
  userPrompt?: string;
  previousContent?: string[];
  generateImage?: boolean;
  availableMedia?: IMediaUpload[];
}

interface GeneratedContent {
  text: string;
  hashtags: string[];
  reasoning: string;
  imageUrl?: string;
  imagePrompt?: string;
  imageError?: string; // Error message if image generation failed
  metadata: {
    model: string;
    temperature: number;
    promptTokens: number;
    completionTokens: number;
  };
  selectedMediaId?: string;
}

export class AIAgentService {
  private client: Anthropic | null = null;
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private log(message: string, data?: any) {
    if (data) {
      console.log(`[AI-AGENT] ${message}`, data);
    } else {
      console.log(`[AI-AGENT] ${message}`);
    }
  }

  public validateConfig(): boolean {
    const key = this.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      console.error(
        '[AI-AGENT] ❌ Missing ANTHROPIC_API_KEY environment variable',
      );
      return false;
    }
    return true;
  }

  private getClient(): Anthropic {
    if (!this.client) {
      const key = this.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!key) {
        throw new Error(
          'Anthropic API Key is missing. expected ANTHROPIC_API_KEY environment variable.',
        );
      }
      this.client = new Anthropic({ apiKey: key });
    }
    return this.client;
  }

  /**
   * Step 1: Analyze brand voice and context
   */
  private async analyzeBrandContext(
    brandConfig: IBrandConfig,
  ): Promise<string> {
    const prompt = `You are a brand strategist. Analyze this brand profile and create a comprehensive brand voice guide:

Brand Name: ${brandConfig.name}
Industry: ${brandConfig.industry}
Voice Tone: ${brandConfig.voiceTone.join(', ')}
Target Audience: ${brandConfig.targetAudience}
Key Messages: ${brandConfig.keyMessages.join(', ')}
Topics to Avoid: ${brandConfig.doNotMention.join(', ')}

Provide a detailed brand voice analysis that will guide content creation. Include:
1. Writing style characteristics
2. Tone and personality traits
3. Language patterns and preferences
4. Content themes that resonate with the target audience`;

    const response = await this.getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(
      (block) => block.type === 'text',
    );
    return textContent && textContent.type === 'text'
      ? textContent.text
      : '';
  }

  /**
   * Step 2: Generate platform-specific content
   */
  private async generatePlatformContent(
    brandVoiceAnalysis: string,
    platform: Platform,
    mediaContext?: string,
    userPrompt?: string,
    previousContent?: string[],
    availableMedia?: IMediaUpload[],
  ): Promise<{
    content: string;
    reasoning: string;
    selectedMediaId?: string;
  }> {
    const platformGuidelines = this.getPlatformGuidelines(platform);

    // Format available media for the prompt
    let mediaList = '';
    if (availableMedia && availableMedia.length > 0) {
      mediaList = availableMedia
        .map(
          (m) =>
            `- ID: ${m._id}
  Type: ${m.mimetype}
  Name: ${m.originalName}
  Description: ${m.metadata?.description || 'No description'}
  Tags: ${m.metadata?.tags?.join(', ') || 'None'}`,
        )
        .join('\n\n');
    }

    const prompt = `You are a social media content creator. Generate engaging content for ${platform}.

BRAND VOICE ANALYSIS:
${brandVoiceAnalysis}

PLATFORM GUIDELINES:
${platformGuidelines}

${mediaContext ? `MEDIA CONTEXT:\n${mediaContext}\n` : ''}
${userPrompt ? `SPECIFIC REQUEST:\n${userPrompt}\n` : ''}
${
  availableMedia && availableMedia.length > 0
    ? `AVAILABLE MEDIA ASSETS:
The client has uploaded the following media assets. If one of these is HIGHLY RELEVANT to the content being generated, you may select it.
${mediaList}

INSTRUCTION: If you select a media asset, include "MEDIA_SELECTED: <ID>" in your response. Only select an asset if it fits well. If you select an existing asset, valid text content is still required, but do NOT suggest generating a new image.`
    : ''
}
${
  previousContent && previousContent.length > 0
    ? `CRITICAL INSTRUCTION: You must avoid the themes, specific phrases, and starting hooks used in these recent posts:
${previousContent.map((c, i) => `${i + 1}. "${c.substring(0, 100)}..."`).join('\n')}

DO NOT use the same opening sentence structure.
DO NOT reuse specific statistics or examples unless requested.
Vary the angle and emotional hook.`
    : ''
}

Generate ONE complete social media post that:
1. Follows the brand voice perfectly
2. Adheres to ${platform} best practices
3. ${mediaContext ? 'References and describes the provided media' : 'Works as standalone text'}
4. Is ready to publish immediately
5. Is completely distinct from the recent posts listed above in both content and structure

Format your response as:
CONTENT:
[The actual post text here]

REASONING:
[Brief explanation of your creative choices]
${availableMedia && availableMedia.length > 0 ? '\nMEDIA_SELECTED: [Optional ID of selected media]' : ''}`;

    const response = await this.getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(
      (block) => block.type === 'text',
    );
    const fullText =
      textContent && textContent.type === 'text'
        ? textContent.text
        : '';

    // Parse content and reasoning
    const contentMatch = fullText.match(
      /CONTENT:\s*([\s\S]*?)(?=REASONING:|MEDIA_SELECTED:|$)/,
    );
    const reasoningMatch = fullText.match(
      /REASONING:\s*([\s\S]*?)(?=MEDIA_SELECTED:|$)/,
    );
    const mediaMatch = fullText.match(
      /MEDIA_SELECTED:\s*([a-f0-9]+)/i,
    );

    return {
      content: contentMatch ? contentMatch[1].trim() : fullText,
      reasoning: reasoningMatch
        ? reasoningMatch[1].trim()
        : 'No reasoning provided',
      selectedMediaId: mediaMatch ? mediaMatch[1].trim() : undefined,
    };
  }

  /**
   * Step 3: Extract and optimize hashtags
   */
  private async extractHashtags(
    content: string,
    platform: Platform,
  ): Promise<string[]> {
    const prompt = `Extract or generate optimal hashtags for this ${platform} post:

POST CONTENT:
${content}

Provide 3-7 relevant hashtags that would maximize reach and engagement on ${platform}.
Return ONLY the hashtags, one per line, with the # symbol.`;

    const response = await this.getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(
      (block) => block.type === 'text',
    );
    const hashtagText =
      textContent && textContent.type === 'text'
        ? textContent.text
        : '';

    return hashtagText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('#'))
      .slice(0, 7);
  }

  /**
   * Main orchestration method
   */
  async generateContent(
    request: ContentGenerationRequest,
  ): Promise<GeneratedContent> {
    try {
      // Step 1: Analyze brand
      this.log('Step 1: Analyzing brand voice...');
      const brandVoiceAnalysis = await this.analyzeBrandContext(
        request.brandConfig,
      );

      // Step 2: Generate content
      this.log('Step 2: Generating platform content...');
      const {
        content: generatedText,
        reasoning,
        selectedMediaId,
      } = await this.generatePlatformContent(
        brandVoiceAnalysis,
        request.platform,
        request.mediaContext,
        request.userPrompt,
        request.previousContent,
        request.availableMedia,
      );

      // Step 3: Extract hashtags
      this.log('Step 3: Optimizing hashtags...');
      const hashtags = await this.extractHashtags(
        generatedText,
        request.platform,
      );

      // Step 4: Generate image (optional)
      let imageUrl: string | undefined;
      let imagePrompt: string | undefined;
      let imageError: string | undefined;
      // Only generate an image if requested AND the agent didn't select an existing asset
      if (request.generateImage && !selectedMediaId) {
        this.log('Step 4: Generating AI image...');
        try {
          // Generate image prompt based on content
          imagePrompt =
            await imageGenerationService.generateImagePrompt(
              generatedText,
              request.platform,
              `Brand: ${request.brandConfig.name}, Industry: ${request.brandConfig.industry}`,
            );

          // Generate image using DALL-E 3
          const imageResult =
            await imageGenerationService.generateImage(
              imagePrompt,
              request.platform,
            );
          imageUrl = imageResult.cloudinaryUrl;
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : 'Unknown error';
          console.error(
            '⚠️ Image generation failed (continuing without image):',
            errorMsg,
          );
          imageError = errorMsg;
          // Don't fail the entire generation if image fails
        }
      }

      return {
        text: generatedText, // content was renamed to generatedText
        hashtags,
        reasoning,
        imageUrl,
        imagePrompt,
        imageError,
        metadata: {
          model: 'claude-sonnet-4-20250514',
          temperature: 0.7,
          promptTokens: 0, // Would need to calculate from actual usage
          completionTokens: 0,
        },
        selectedMediaId, // Pass back selected media ID
      };
    } catch (error) {
      console.error('❌ AI Agent Error:', error);
      throw new Error(
        `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Regenerate content with feedback
   */
  async regenerateContent(
    originalContent: string,
    feedback: string,
    request: ContentGenerationRequest,
  ): Promise<GeneratedContent> {
    const brandVoiceAnalysis = await this.analyzeBrandContext(
      request.brandConfig,
    );
    const platformGuidelines = this.getPlatformGuidelines(
      request.platform,
    );

    const prompt = `You are revising social media content based on feedback.

BRAND VOICE:
${brandVoiceAnalysis}

PLATFORM: ${request.platform}
${platformGuidelines}

ORIGINAL CONTENT:
${originalContent}

FEEDBACK:
${feedback}

Generate an improved version that addresses the feedback while maintaining brand voice and platform best practices.

Format your response as:
CONTENT:
[Revised post text]

REASONING:
[Explanation of changes made]`;

    const response = await this.getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(
      (block) => block.type === 'text',
    );
    const fullText =
      textContent && textContent.type === 'text'
        ? textContent.text
        : '';

    const contentMatch = fullText.match(
      /CONTENT:\s*([\s\S]*?)(?=REASONING:|$)/,
    );
    const reasoningMatch = fullText.match(/REASONING:\s*([\s\S]*?)$/);

    const content = contentMatch ? contentMatch[1].trim() : fullText;
    const hashtags = await this.extractHashtags(
      content,
      request.platform,
    );

    // Generate image if requested
    let imageUrl: string | undefined;
    let imagePrompt: string | undefined;
    let imageError: string | undefined;

    if (request.generateImage) {
      try {
        const imageResult = await this.generateImageForContent(
          content,
          request.platform,
        );
        imageUrl = imageResult.imageUrl;
        imagePrompt = imageResult.imagePrompt;
        if (imageResult.error) {
          imageError = imageResult.error;
        }
      } catch (err) {
        imageError = err instanceof Error ? err.message : 'Unknown error';
        console.error('Image generation failed during regenerate:', imageError);
      }
    }

    return {
      text: content,
      hashtags,
      reasoning: reasoningMatch
        ? reasoningMatch[1].trim()
        : 'No reasoning provided',
      imageUrl,
      imagePrompt,
      imageError,
      metadata: {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.7,
        promptTokens: 0,
        completionTokens: 0,
      },
    };
  }

  /**
   * Get platform-specific guidelines
   */
  private getPlatformGuidelines(platform: Platform): string {
    const guidelines = {
      linkedin: `- Professional tone, thought leadership
- Ideal length: 1,300-2,000 characters
- Focus on business insights, industry trends
- Use line breaks for readability
- Hashtags: 3-5 relevant professional tags`,

      instagram: `- Visual-first, conversational tone
- Ideal length: 138-150 characters (short) or 2,000+ (storytelling)
- Emphasize lifestyle, aesthetics, authenticity
- Strong opening line to hook scrollers
- Hashtags: 5-7 relevant, mix popular and niche`,

      twitter: `- Concise, punchy, conversational
- Max length: 280 characters (use threads for longer content)
- Focus on timely, engaging topics
- Use hooks and questions
- Hashtags: 1-2 max`,

      facebook: `- Friendly, community-focused tone
- Ideal length: 40-80 characters for high engagement
- Questions and polls work well
- Emphasize storytelling and emotion
- Hashtags: 1-3 relevant tags`,
    };

    return guidelines[platform];
  }
  /**
   * Analyze an image to generate description and tags
   */
  async analyzeImage(
    imageUrl: string,
  ): Promise<{ description: string; tags: string[] }> {
    try {
      this.log('Analyzing image...');

      const prompt = `Analyze this image and provide a concise description and relevant tags.
      
      Format your response exactly like this:
      DESCRIPTION: [A clear, detailed description of the image content, style, and mood]
      TAGS: [tag1, tag2, tag3, tag4, tag5]
      
      Provide 5-10 relevant tags.`;

      // Fetch the image to convert to base64 (Claude API requires base64 for images)
      const imageResponse = await fetch(imageUrl);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString('base64');
      const mediaType = imageUrl.endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';

      const response = await this.getClient().messages.create({
        model: 'claude-3-haiku-20240307', // Fallback to Haiku for vision
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType as
                    | 'image/jpeg'
                    | 'image/png'
                    | 'image/gif'
                    | 'image/webp',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const textContent = response.content.find(
        (block) => block.type === 'text',
      );
      const fullText =
        textContent && textContent.type === 'text'
          ? textContent.text
          : '';

      const descriptionMatch = fullText.match(
        /DESCRIPTION:\s*([\s\S]*?)(?=TAGS:|$)/,
      );
      const tagsMatch = fullText.match(/TAGS:\s*\[?([\s\S]*?)\]?$/);

      const description = descriptionMatch
        ? descriptionMatch[1].trim()
        : 'No description available';
      const tagsString = tagsMatch ? tagsMatch[1].trim() : '';
      const tags = tagsString
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      this.log('Image analysis complete', {
        description: description.substring(0, 50) + '...',
        tags,
      });

      return { description, tags };
    } catch (error) {
      console.error(
        '❌ Image analysis failed:',
        JSON.stringify(error, null, 2),
      );
      return {
        description:
          'Image analysis failed: ' +
          (error instanceof Error ? error.message : String(error)),
        tags: [],
      };
    }
  }

  /**
   * Generate an image for existing content
   */
  async generateImageForContent(
    contentText: string,
    platform: Platform,
  ): Promise<{ imageUrl?: string; imagePrompt?: string; error?: string }> {
    try {
      this.log('Generating image for existing content...');

      // Generate image prompt based on content
      const imagePrompt = await imageGenerationService.generateImagePrompt(
        contentText,
        platform,
        'Generate a visually compelling image for this social media post',
      );

      // Generate image using DALL-E 3
      const imageResult = await imageGenerationService.generateImage(
        imagePrompt,
        platform,
      );

      return {
        imageUrl: imageResult.cloudinaryUrl,
        imagePrompt,
      };
    } catch (error) {
      console.error('❌ Image generation failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const aiAgent = new AIAgentService();
