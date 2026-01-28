import axios from 'axios';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

export const linkedinService = {
  getAuthUrl: (state: string) => {
    if (!LINKEDIN_CLIENT_ID)
      throw new Error('LinkedIn Client ID not configured');

    // Scopes needed for posting and profile
    const scope = ['w_member_social', 'r_liteprofile'].join(' ');

    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI || '')}&state=${state}&scope=${scope}`;
  },

  exchangeCodeForToken: async (code: string) => {
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      throw new Error('LinkedIn credentials not configured');
    }

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', LINKEDIN_REDIRECT_URI || '');
      params.append('client_id', LINKEDIN_CLIENT_ID);
      params.append('client_secret', LINKEDIN_CLIENT_SECRET);

      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data; // { access_token, expires_in, ... }
    } catch (error: any) {
      console.error(
        'LinkedIn Token Exchange Failed:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to exchange LinkedIn code');
    }
  },

  getProfile: async (accessToken: string) => {
    try {
      const response = await axios.get(
        'https://api.linkedin.com/v2/me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'LinkedIn Profile Fetch Failed:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to fetch LinkedIn profile');
    }
  },

  createPost: async (
    text: string,
    overrideToken?: string,
    overridePersonUrn?: string,
    imageUrl?: string,
  ) => {
    try {
      // Prioritize User Override, then fallback to Env
      const accessToken =
        overrideToken || process.env.LINKEDIN_ACCESS_TOKEN;
      const personUrn =
        overridePersonUrn || process.env.LINKEDIN_PERSON_URN; // "urn:li:person:..." ID

      if (!accessToken || !personUrn) {
        throw new Error(
          'LinkedIn Access Token or Person URN not configured (User or Env)',
        );
      }

      let mediaAsset = null;
      let shareMediaCategory = 'NONE';
      let media: any[] = [];

      // If we have an image, upload it first
      if (imageUrl) {
        try {
          console.log('🖼️ Starting LinkedIn Image Upload:', imageUrl);
          const { uploadUrl, asset } =
            await linkedinService.registerUpload(
              accessToken,
              personUrn,
            );

          const imageBuffer = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
          });
          await linkedinService.uploadImage(
            uploadUrl,
            imageBuffer.data,
            accessToken,
          );

          mediaAsset = asset;
          shareMediaCategory = 'IMAGE';
          media = [
            {
              status: 'READY',
              description: { text: text.substring(0, 200) }, // Optional description, max 200 chars for title usually
              media: asset,
              title: { text: 'Shared Image' },
            },
          ];
          console.log('✅ LinkedIn Image Uploaded. Asset:', asset);
        } catch (e: any) {
          console.error(
            '⚠️ LinkedIn Image Upload Failed, falling back to text post:',
            e.response?.data || e.message,
          );
          // Fallback to NONE
        }
      }

      // Basic structure for UGC Post API
      const postData = {
        author: `urn:li:person:${personUrn}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text,
            },
            shareMediaCategory: shareMediaCategory,
            ...(mediaAsset && { media: media }),
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        postData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        },
      );

      return response.data;
    } catch (error: any) {
      console.error(
        'LinkedIn Post Failed:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to post to LinkedIn: ${error.response?.data?.message || error.message}`,
      );
    }
  },

  registerUpload: async (accessToken: string, personUrn: string) => {
    const registerBody = {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: `urn:li:person:${personUrn}`,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    };

    const response = await axios.post(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      registerBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    );

    return {
      uploadUrl:
        response.data.value.uploadMechanism[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ].uploadUrl,
      asset: response.data.value.asset,
    };
  },

  uploadImage: async (
    uploadUrl: string,
    imageBuffer: any,
    accessToken: string,
  ) => {
    await axios.put(uploadUrl, imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
  },
};
