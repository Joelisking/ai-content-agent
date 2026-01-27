import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

const JWT_SECRET =
  process.env.JWT_SECRET || 'dev_secret_do_not_use_in_prod';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Check for token in cookies
    const token = req.cookies.token;

    if (!token) {
      return res
        .status(401)
        .json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Check if user exists (optional, but safer)
    const user = await User.findById(decoded.id).select(
      '-passwordHash',
    );
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: 'Invalid or expired token' });
  }
};

export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res
      .status(403)
      .json({ error: 'Access denied: Admin role required' });
  }
};
