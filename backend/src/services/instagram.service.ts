import axios from 'axios';

export class InstagramService {
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    // Credentials accessed lazily to avoid init-order issues
  }

  private getCredentials(token?: string) {
    const accessToken =
      token || process.env.INSTAGRAM_ACCESS_TOKEN || '';
    const accountId = process.env.INSTAGRAM_ACCOUNT_ID || '';
    // If no token provided and no env token, we can't proceed.
    // But accountId is also needed. For OAuth users, we need to fetch their pages to get account ID.
    // Minimally, we need a token.
    return { accessToken, accountId };
  }

  getAuthUrl(state: string) {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI; // e.g. /api/instagram/callback
    if (!clientId || !redirectUri)
      throw new Error(
        'Instagram Client ID/Redirect URI not configured',
      );

    // Scopes for Instagram Business
    // instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement
    const scope = [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
    ].join(',');

    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}&response_type=code`;
  }

  async exchangeCodeForToken(code: string) {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri)
      throw new Error('Instagram Credentials missing');

    try {
      // Exchange code for short-lived token
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/oauth/access_token`,
        {
          params: {
            client_id: clientId,
            redirect_uri: redirectUri,
            client_secret: clientSecret,
            code: code,
          },
        },
      );
      const shortLivedToken = response.data.access_token;

      // Exchange for long-lived token (60 days)
      const longLivedResponse = await axios.get(
        `https://graph.facebook.com/v18.0/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: clientId,
            client_secret: clientSecret,
            fb_exchange_token: shortLivedToken,
          },
        },
      );

      return longLivedResponse.data; // { access_token, expires_in, ... }
    } catch (error: any) {
      console.error(
        'Instagram Token Exchange Failed:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to exchange Instagram code');
    }
  }

  async getProfile(accessToken: string) {
    try {
      // 1. Get User's Pages
      const pagesResponse = await axios.get(
        `${this.baseUrl}/me/accounts`,
        {
          params: { access_token: accessToken },
        },
      );

      const pages = pagesResponse.data.data;
      if (!pages || pages.length === 0)
        throw new Error(
          'No Facebook Pages found. Make sure you have a Page.',
        );

      // 2. Find the first Page with a connected Instagram Business Account
      let igBusinessAccount = null;
      let pageName = '';

      for (const page of pages) {
        // We need to get the IG Business ID for this page
        const pageDetails = await axios.get(
          `${this.baseUrl}/${page.id}`,
          {
            params: {
              fields: 'instagram_business_account',
              access_token: page.access_token, // Page access token, or user token? User token usually works if scope is right.
              // Actually, we use the user access token to read 'accounts'.
              // But to interact, we might need page token?
              // For IG Content Publishing, we use User Access Token with permissions.
            },
          },
        );

        if (pageDetails.data.instagram_business_account) {
          igBusinessAccount =
            pageDetails.data.instagram_business_account;
          pageName = page.name;
          break;
        }
      }

      if (!igBusinessAccount)
        throw new Error(
          'No Instagram Business Account connected to your Facebook Pages.',
        );

      // 3. Get IG Username
      const igDetails = await axios.get(
        `${this.baseUrl}/${igBusinessAccount.id}`,
        {
          params: {
            fields: 'username,profile_picture_url',
            access_token: accessToken,
          },
        },
      );

      return {
        id: igBusinessAccount.id,
        username: igDetails.data.username,
        access_token: accessToken, // We keep the User Long-Lived Token
      };
    } catch (error: any) {
      console.error(
        'Instagram Profile Fetch Failed:',
        error.response?.data || error.message,
      );
      throw new Error(
        'Failed to fetch Instagram profile: ' +
          (error.response?.data?.error?.message || error.message),
      );
    }
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
      console.log(
        `Container status (attempt ${attempt}/${maxAttempts}): ${statusCode}`,
      );

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
    overrideToken?: string,
    overrideAccountId?: string,
  ): Promise<{ id: string; permalink: string }> {
    // If override provided, use it. Otherwise fall back to env via getCredentials.
    // Note: getCredentials now takes optional token but we handle logic here for clarity.
    let accessToken = overrideToken;
    let accountId = overrideAccountId;

    if (!accessToken || !accountId) {
      const creds = this.getCredentials();
      if (!accessToken) accessToken = creds.accessToken;
      if (!accountId) accountId = creds.accountId;
    }

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
