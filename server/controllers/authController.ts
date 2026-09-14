import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { getPool } from '../config/db.ts';
import { AuthRequest } from '../middleware/auth.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'task_management_jwt_secret_key_production_ready';
const JWT_EXPIRES_IN = '7d';

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
      return;
    }

    const { name, email, password } = req.body;
    const pool = getPool();

    // 1. Check if user already exists
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
      return;
    }

    // 2. Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Insert user into MySQL using parameterized query
    const [result] = await pool.execute<any>(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    const userId = result.insertId;

    // 4. Generate JWT
    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), name: name.trim() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome aboard.',
      data: {
        user: {
          id: userId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
      return;
    }

    const { email, password } = req.body;
    const pool = getPool();

    // 1. Query user from MySQL
    const [rows] = await pool.execute<any[]>(
      'SELECT id, name, email, password, created_at FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials.',
      });
      return;
    }

    const user = rows[0];

    // 2. Compare password with bcryptjs
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials.',
      });
      return;
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current logged in user
 * GET /api/auth/me
 */
export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const pool = getPool();
    const [rows] = await pool.execute<any[]>(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const user = rows[0];

    // Total tasks count for user profile
    const [stats] = await pool.execute<any[]>(
      'SELECT COUNT(*) as total_tasks FROM tasks WHERE user_id = ?',
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'User profile retrieved.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          totalTasks: stats[0]?.total_tasks || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Logout
 * POST /api/auth/logout
 */
export function logout(req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}
