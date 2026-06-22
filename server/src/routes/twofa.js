import express from 'express';
import { authenticator } from '@otplib/preset-default';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { userOps } from '../config/database.js';
import { authenticate, generateToken } from '../middleware/auth.js';

const router = express.Router();

const APP_NAME = 'NEXAR';

// Generate 2FA setup secret + QR code
router.post('/setup', authenticate, async (req, res) => {
  try {
    const user = await userOps.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.totp_enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, APP_NAME, secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    // Store secret temporarily (not enabled yet until verified)
    await userOps.update(req.userId, { totp_secret: secret });

    res.json({ secret, qrCode });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Verify TOTP code and enable 2FA
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Verification code required' });

    const user = await userOps.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.totp_secret) return res.status(400).json({ error: '2FA not setup yet' });
    if (user.totp_enabled) return res.status(400).json({ error: '2FA already enabled' });

    const isValid = authenticator.verify({ token, secret: user.totp_secret });
    if (!isValid) return res.status(400).json({ error: 'Invalid verification code' });

    // Generate recovery codes
    const recoveryCodes = Array.from({ length: 8 }, () => uuidv4().replace(/-/g, '').slice(0, 10));

    await userOps.update(req.userId, { totp_enabled: true, recovery_codes: JSON.stringify(recoveryCodes) });

    res.json({ success: true, recoveryCodes });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// Disable 2FA
router.post('/disable', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await userOps.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.totp_enabled) return res.status(400).json({ error: '2FA is not enabled' });

    if (token) {
      const isValid = authenticator.verify({ token, secret: user.totp_secret });
      if (!isValid) return res.status(400).json({ error: 'Invalid verification code' });
    }

    await userOps.update(req.userId, { totp_secret: null, totp_enabled: false, recovery_codes: null });
    res.json({ success: true });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Get 2FA status
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await userOps.findById(req.userId);
    res.json({
      totp_enabled: !!user?.totp_enabled,
      github_2fa_enabled: !!user?.github_2fa_enabled,
      github_2fa_id: user?.github_2fa_id || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

// Enable GitHub 2FA (links current user's GitHub account as 2FA)
router.post('/github/enable', authenticate, async (req, res) => {
  try {
    const user = await userOps.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.github_2fa_enabled) return res.status(400).json({ error: 'GitHub 2FA already enabled' });
    if (user.totp_enabled) return res.status(400).json({ error: 'Disable TOTP 2FA first' });

    if (!user.github_2fa_id && (!user.provider || user.provider !== 'github')) {
      return res.json({ needLink: true, redirectUrl: `/api/auth/oauth/github?mode=link&userId=${user.id}` });
    }

    const githubId = user.github_2fa_id || user.provider_id;
    await userOps.update(req.userId, { github_2fa_enabled: true, github_2fa_id: githubId, totp_secret: null, totp_enabled: false, recovery_codes: null });
    res.json({ success: true });
  } catch (error) {
    console.error('GitHub 2FA enable error:', error);
    res.status(500).json({ error: 'Failed to enable GitHub 2FA' });
  }
});

// Disable GitHub 2FA
router.post('/github/disable', authenticate, async (req, res) => {
  try {
    const user = await userOps.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.github_2fa_enabled) return res.status(400).json({ error: 'GitHub 2FA not enabled' });

    await userOps.update(req.userId, { github_2fa_enabled: false });
    res.json({ success: true });
  } catch (error) {
    console.error('GitHub 2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable GitHub 2FA' });
  }
});

// Challenge — verify 2FA code during login (called after password check)
router.post('/challenge', async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: 'userId and token required' });

    const user = await userOps.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.totp_enabled) return res.status(400).json({ error: '2FA not enabled' });

    // Check recovery codes
    let recoveryUsed = false;
    if (user.recovery_codes) {
      const codes = JSON.parse(user.recovery_codes);
      const idx = codes.indexOf(token);
      if (idx !== -1) {
        codes.splice(idx, 1);
        await userOps.update(user.id, { recovery_codes: JSON.stringify(codes) });
        recoveryUsed = true;
      }
    }

    if (!recoveryUsed) {
      const isValid = authenticator.verify({ token, secret: user.totp_secret });
      if (!isValid) return res.status(400).json({ error: 'Invalid verification code' });
    }

    const jwt = generateToken(user);
    res.json({ token: jwt, user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url } });
  } catch (error) {
    console.error('2FA challenge error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;