import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

// Load .env.local first, then .env as fallback
dotenv.config({ path: '.env.local' });
dotenv.config(); // Load .env as fallback

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

const PORT = process.env.PORT || 3001;

// For demo: Generate simple keys (in production, use proper RSA key pair)
// Using HS256 for demo since we don't have RSA keys set up
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-use-rsa-keys';

// Debug: Log JWT_SECRET (first 10 chars only for security)
console.log('Auth Service - JWT_SECRET loaded:', JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'NOT SET');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// JWKS endpoint (for RS256 - simplified for demo)
app.get('/.well-known/jwks.json', (req, res) => {
  // In production, generate proper JWKS from RSA public key
  // For demo, we're using HS256, so this endpoint returns empty
  res.json({
    keys: [],
  });
});

// Get current user (verify token)
app.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        sub: string;
        email: string;
        role: string;
        orgId?: string;
      };

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.sub))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
      JWT_SECRET,
      {
        algorithm: 'HS256', // Using HS256 for demo (use RS256 with proper keys in production)
        expiresIn: '15m',
      }
    );

    console.log('🔐 TOKEN GENERATED:');
    console.log('  - User:', user.email);
    console.log('  - Token (first 50 chars):', token.substring(0, 50) + '...');
    console.log('  - Token length:', token.length);
    console.log('  - JWT_SECRET used (first 10 chars):', JWT_SECRET.substring(0, 10) + '...');
    console.log('  - JWT_SECRET length:', JWT_SECRET.length);

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, role = 'customer' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      role,
    });

    res.status(201).json({ id: userId, email, role });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
