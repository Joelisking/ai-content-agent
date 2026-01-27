import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const JWT_SECRET =
  process.env.JWT_SECRET || 'dev_secret_do_not_use_in_prod';

// Register (First user is admin, others can be configured)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, secretKey } = req.body;

    // Basic validation
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Determine role (simplified logic: if secretKey provided, make admin)
    // In production, this would be stricter.
    const role =
      secretKey === process.env.ADMIN_SECRET_KEY ? 'admin' : 'editor';

    // Create user
    const user = new User({
      email,
      passwordHash,
      name,
      role,
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' },
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        error:
          error instanceof Error ? error.message : 'Unknown error',
      });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' },
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        error:
          error instanceof Error ? error.message : 'Unknown error',
      });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get Current User (Me)
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    user: req.user,
  });
});

export default router;
