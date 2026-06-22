import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { userOps } from '../config/database.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// Redirect to Google OAuth
router.get('/google', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/oauth/google/callback`;
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    'response_type=code&' +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `state=${encodeURIComponent(CLIENT_URL)}`;
  res.redirect(url);
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${CLIENT_URL}/login?error=no_code`);
    }

    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/oauth/google/callback`;

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      return res.redirect(`${CLIENT_URL}/login?error=token_exchange_failed`);
    }

    const tokenData = await tokenResp.json();
    const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userResp.ok) {
      return res.redirect(`${CLIENT_URL}/login?error=userinfo_failed`);
    }

    const profile = await userResp.json();
    let user = await userOps.findByProvider('google', profile.id);

    if (!user) {
      user = await userOps.findByEmail(profile.email);
      if (user) {
        await userOps.update(user.id, { provider: 'google', provider_id: profile.id, avatar_url: profile.picture });
      } else {
        const userId = uuidv4();
        await userOps.create(userId, profile.email, null, profile.name || profile.email.split('@')[0], 'google', profile.id);
        user = await userOps.findById(userId);
      }
    } else {
      await userOps.update(user.id, { avatar_url: profile.picture, name: profile.name || user.name });
    }

    const token = generateToken(user);
    const returnUrl = state || CLIENT_URL;
    res.redirect(`${returnUrl}/login?token=${token}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
  }
});

// Redirect to GitHub OAuth
router.get('/github', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/oauth/github/callback`;
  const url =
    'https://github.com/login/oauth/authorize?' +
    `client_id=${GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent('read:user user:email')}&` +
    `state=${encodeURIComponent(CLIENT_URL)}`;
  res.redirect(url);
});

// GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${CLIENT_URL}/login?error=no_code`);
    }

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
      return res.redirect(`${CLIENT_URL}/login?error=token_exchange_failed`);
    }

    const tokenData = await tokenResp.json();
    if (tokenData.error) {
      return res.redirect(`${CLIENT_URL}/login?error=${tokenData.error}`);
    }

    const userResp = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userResp.ok) {
      return res.redirect(`${CLIENT_URL}/login?error=userinfo_failed`);
    }

    const profile = await userResp.json();

    let email = profile.email;
    if (!email) {
      const emailsResp = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (emailsResp.ok) {
        const emails = await emailsResp.json();
        const primary = emails.find(e => e.primary && e.verified);
        email = primary ? primary.email : (emails[0]?.email || `gh-${profile.id}@github.oauth`);
      }
    }

    let user = await userOps.findByProvider('github', String(profile.id));

    if (!user) {
      user = await userOps.findByEmail(email);
      if (user) {
        await userOps.update(user.id, { provider: 'github', provider_id: String(profile.id), avatar_url: profile.avatar_url });
      } else {
        const userId = uuidv4();
        await userOps.create(userId, email, null, profile.login || email.split('@')[0], 'github', String(profile.id));
        user = await userOps.findById(userId);
      }
    } else {
      await userOps.update(user.id, { avatar_url: profile.avatar_url, name: profile.login || user.name });
    }

    const token = generateToken(user);
    const returnUrl = state || CLIENT_URL;
    res.redirect(`${returnUrl}/login?token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
  }
});

export default router;