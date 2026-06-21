import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { userOps } from '../config/database.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user exists
    const existing = await userOps.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    
    // Create user
    await userOps.create(userId, email, passwordHash, name || email.split('@')[0]);
    
    const user = await userOps.findById(userId);
    const token = generateToken(user);
    
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = await userOps.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user);
    
    res.json({
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  const user = await userOps.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url } });
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, password, newPassword } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    
    if (password && newPassword) {
      const user = await userOps.findById(req.userId);
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password incorrect' });
      }
      updates.password_hash = await bcrypt.hash(newPassword, 12);
    }
    
    if (Object.keys(updates).length > 0) {
      await userOps.update(req.userId, updates);
    }
    
    const user = await userOps.findById(req.userId);
    res.json({ user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url } });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Refresh token
router.post('/refresh', authenticate, async (req, res) => {
  const user = await userOps.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const token = generateToken(user);
  res.json({ token });
});

export default router;
