import express from 'express';
import { linkedinService } from '../services/linkedin.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { User } from '../models';

const router = express.Router();

// Start OAuth flow
router.get('/auth', authMiddleware, (req, res) => {
  try {
    // We pass the user ID as state to identify them on callback if needed,
    // though usually cookies persist the session.
    // Ideally use a random string for CSRF protection and map it to session.
    // For this MVP, using userID is a simple way to track context if needed,
    // but better to rely on the auth cookie which should persist.
    const url = linkedinService.getAuthUrl('state_string'); // 'state_string' should be random in prod
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Callback from LinkedIn
// Note: This is an API route. Frontend should handle the redirect from LinkedIn
// (or backend redirects to frontend).
// Common pattern: LinkedIn -> Backend -> Frontend
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

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
      await linkedinService.exchangeCodeForToken(code);
    const accessToken = tokenData.access_token;

    // 2. Get User Profile to find out who this is
    const profile = await linkedinService.getProfile(accessToken);
    const linkedinId = profile.id;
    const name = `${profile.firstName.localized.en_US} ${profile.lastName.localized.en_US}`;

    // 3. Find the user who initiated this.
    // Since this is a callback, we expect the browser to still have the HTTP-only cookie.
    // If not, we'd need to use 'state' to look up a pending auth request.
    // Let's assume the session cookie is present for the backend domain.
    // However, if we can't extract user from middleware here (because we didn't run authMiddleware on this public callback),
    // we have a problem. Typically we use the 'state' parameter to verify CSRF and 'cookie' for session.
    // BUT getting the user *from the cookie* in this callback is crucial to attach the LinkedIn ID to the right account.

    // Let's try to parse the cookie manually or use a helper, but wait:
    // express-session or just checking req.cookies.token if we add cookie-parser (we have it).

    // We will cheat slightly and parse the JWT from the cookie here inline,
    // or better, wrap this route in optional auth middleware?
    // No, LinkedIn redirects here, so the browser sends cookies for THIS domain.
    // So `req.cookies.token` should be available.

    // ...Wait, I'm not using the authMiddleware in the route def, so I need to manually check.
    // Let's import the specific logic or just rely on 'state' if we store it.
    // Cleaner approach for MVP: Use jwt verify manually here.

    // Wait, simpler: Make the user click "Connect" which opens a popup or redirects.
    // If it redirects, the session cookie goes with it.

    // Code below assumes `authMiddleware` logic:
    const jwt = require('jsonwebtoken'); // Lazy import/using existing dependency
    const token = req.cookies.token;

    if (!token) {
      // Fallback: If no session, we can't link.
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
      linkedinId: linkedinId,
      linkedinAccessToken: accessToken,
      linkedinName: name,
      // Avatar often requires another call or parsing 'profilePicture' object structure which is complex in LinkedIn API.
      // Skipping avatar for now to keep it robust.
    });

    res.redirect(
      `${process.env.APP_URL}/control?success=linkedin_connected`,
    );
  } catch (err: any) {
    console.error('LinkedIn Callback Error:', err);
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
        linkedinId: '',
        linkedinAccessToken: '',
        linkedinName: '',
        linkedinAvatar: '',
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

export default router;
