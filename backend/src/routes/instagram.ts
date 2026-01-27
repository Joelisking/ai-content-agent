import express from 'express';
import { instagramService } from '../services/instagram.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { User } from '../models';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Start OAuth flow
router.get('/auth', authMiddleware, (req, res) => {
  try {
    const url = instagramService.getAuthUrl('state_string');
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Callback from Facebook/Instagram
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(
      `${process.env.APP_URL}/control?error=${error}`,
    );
  }

  if (!code || typeof code !== 'string') {
    return res.redirect(
      `${process.env.APP_URL}/control?error=no_code`,
    );
  }

  try {
    // 1. Exchange code for token
    const tokenData =
      await instagramService.exchangeCodeForToken(code);
    const accessToken = tokenData.access_token; // Long-lived user token

    // 2. Get Profile (Find the connected IG Business Account)
    const profile = await instagramService.getProfile(accessToken);

    // 3. Find User
    const token = req.cookies.token;
    if (!token) {
      return res.redirect(
        `${process.env.APP_URL}/control?error=session_expired`,
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev_secret_do_not_use_in_prod',
    ) as any;
    const userId = decoded.id;

    // 4. Update User
    await User.findByIdAndUpdate(userId, {
      instagramId: profile.id, // This is the IG Business Account ID
      instagramAccessToken: accessToken,
      instagramUsername: profile.username,
    });

    res.redirect(
      `${process.env.APP_URL}/control?success=instagram_connected`,
    );
  } catch (err: any) {
    console.error('Instagram Callback Error:', err);
    res.redirect(
      `${process.env.APP_URL}/control?error=callback_failed`,
    );
  }
});

// Disconnect
router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).send();

    await User.findByIdAndUpdate(req.user._id, {
      $unset: {
        instagramId: '',
        instagramAccessToken: '',
        instagramUsername: '',
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

export default router;
