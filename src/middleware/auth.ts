import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.sessionId;
  
  if (sessionId) {
    req.userId = sessionId; 
  }
  
  next(); 
};


export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  next();
};

export const createSessionCookie = (res: Response, userId: string) => {
  res.cookie('sessionId', userId, {
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    sameSite: 'strict',
    maxAge: 10 * 60 * 1000 
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie('sessionId');
};