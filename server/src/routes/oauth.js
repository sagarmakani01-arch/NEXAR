import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { userOps } from '../config/database.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// Redirect to GitHub OAuth
router.get('/github', (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.redirect(`${CLIENT_URL}/login?error=oauth_not_configured`);
  }
  const { mode, userId } = req.query;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/oauth/github/callback`;
  const state = JSON.stringify({ returnUrl: CLIENT_URL, mode: mode || 'login', userId: userId || '' });
  const url =
    'https://github.com/login/oauth/authorize?' +
    `client_id=${GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent('read:user user:email')}&` +
    `state=${encodeURIComponent(state)}`;
  res.redirect(url);
});

// GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state: rawState } = req.query;
    if (!code) {
      return res.redirect(`${CLIENT_URL}/login?error=no_code`);
    }

    let stateData = { returnUrl: CLIENT_URL, mode: 'login', userId: '' };
    try { stateData = JSON.parse(rawState); } catch { stateData.returnUrl = rawState || CLIENT_URL; }

    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/oauth/github/callback`;

    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResp.ok) {
      return res.redirect(`${stateData.returnUrl}/login?error=token_exchange_failed`);
    }

    const tokenData = await tokenResp.json();
    if (tokenData.error) {
      return res.redirect(`${stateData.returnUrl}/login?error=${tokenData.error}`);
    }

    const userResp = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userResp.ok) {
      return res.redirect(`${stateData.returnUrl}/login?error=userinfo_failed`);
    }

    const profile = await userResp.json();
    const githubId = String(profile.id);

    // === 2FA Mode ===
    if (stateData.mode === '2fa') {
      const user = await userOps.findById(stateData.userId);
      if (!user) return res.redirect(`${stateData.returnUrl}/login?error=2fa_user_not_found`);
      if (!user.github_2fa_enabled) return res.redirect(`${stateData.returnUrl}/login?error=2fa_not_enabled`);
      if (user.github_2fa_id !== githubId) return res.redirect(`${stateData.returnUrl}/login?error=2fa_github_mismatch`);

      const token = generateToken(user);
      return res.redirect(`${stateData.returnUrl}/login?token=${token}`);
    }

    // === Normal Login / Link Mode ===
    let email = profile.email;
    if (!email) {
      const emailsResp = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (emailsResp.ok) {
        const emails = await emailsResp.json();
        const primary = emails.find(e => e.primary && e.verified);
        email = primary ? primary.email : (emails[0]?.email || `gh-${githubId}@github.oauth`);
      }
    }

    let user = await userOps.findByProvider('github', githubId);

    if (!user) {
      user = await userOps.findByEmail(email);
      if (user) {
        await userOps.update(user.id, { provider: 'github', provider_id: githubId, avatar_url: profile.avatar_url });
      } else {
        const userId = uuidv4();
        await userOps.create(userId, email, null, profile.login || email.split('@')[0], 'github', githubId);
        user = await userOps.findById(userId);
      }
    } else {
      await userOps.update(user.id, { avatar_url: profile.avatar_url, name: profile.login || user.name });
    }

    const token = generateToken(user);
    res.redirect(`${stateData.returnUrl}/login?token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
  }
});

export default router;