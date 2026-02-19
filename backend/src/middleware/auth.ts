import { Request, Response, NextFunction } from 'express';
import { supabasePublic } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'The Academy gates are sealed. You must present your sigil to enter.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabasePublic.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Your sigil has expired or is corrupted. Return to the entrance and reidentify yourself.',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email ?? '',
    };

    next();
  } catch (err) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'The Gate Rune encountered an unexpected error. Please try again.',
    });
  }
};