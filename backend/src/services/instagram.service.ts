import axios from 'axios';

export class InstagramService {
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    // Credentials accessed lazily to avoid init-order issues
  }

  private getCredentials() {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    const accountId = process.env.INSTAGRAM_ACCOUNT_ID || '';
    return { accessToken, accountId };
  }

  /**
   * Wait for media container to be ready for publishing
   */
  private async waitForContainerReady(
    containerId: string,
    accessToken: string,
    maxAttempts: number = 10,
    delayMs: number = 3000,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const statusResponse = await axios.get(
        `${this.baseUrl}/${containerId}`,
        {
          params: {
            fields: 'status_code,status',
            access_token: accessToken,
          },
        },
      );

      const statusCode = statusResponse.data.status_code;
      console.log(`Container status (attempt ${attempt}/${maxAttempts}): ${statusCode}`);

      if (statusCode === 'FINISHED') {
        return;
      }

      if (statusCode === 'ERROR') {
        throw new Error(
          `Media container processing failed: ${statusResponse.data.status || 'Unknown error'}`,
        );
      }

      // Wait before next check
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new Error('Media container processing timed out');
  }

  /**
   * Publish an image post to Instagram Business Account
   */
  async publishContent(
    imageUrl: string,
    caption: string,
  ): Promise<{ id: string; permalink: string }> {
    const { accessToken, accountId } = this.getCredentials();

    if (!accessToken || !accountId) {
      throw new Error('Instagram credentials not configured in .env');
    }

    try {
      // Step 1: Create Media Container
      console.log('Creating Instagram media container...');
      const containerResponse = await axios.post(
        `${this.baseUrl}/${accountId}/media`,
        null,
        {
          params: {
            image_url: imageUrl,
            caption: caption,
            access_token: accessToken,
          },
        },
      );

      const creationId = containerResponse.data.id;
      console.log(`Media container created: ${creationId}`);

      // Step 2: Wait for container to be ready
      console.log('Waiting for media container to be ready...');
      await this.waitForContainerReady(creationId, accessToken);

      // Step 3: Publish Media
      console.log('Publishing media...');
      const publishResponse = await axios.post(
        `${this.baseUrl}/${accountId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: accessToken,
          },
        },
      );

      const mediaId = publishResponse.data.id;

      // Get Permalink
      const mediaDetails = await axios.get(
        `${this.baseUrl}/${mediaId}`,
        {
          params: {
            fields: 'permalink',
            access_token: accessToken,
          },
        },
      );

      return {
        id: mediaId,
        permalink:
          mediaDetails.data.permalink ||
          `https://instagram.com/p/${mediaId}`,
      };
    } catch (error: any) {
      console.error(
        'Instagram API Error:',
        error.response?.data?.error || error.message,
      );
      throw new Error(
        `Failed to publish to Instagram: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }
}

export const instagramService = new InstagramService();
