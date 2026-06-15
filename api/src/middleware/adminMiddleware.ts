import { Request, Response, NextFunction } from 'express';

export default function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only' });
  }
  next();
}
