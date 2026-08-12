import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface StoreAccessClaim {
  store_id: string;
  role: string;
}

export interface AuthPayload {
  sub: string;
  role?: string;
  stores?: StoreAccessClaim[];
  token_type?: string;
  storeId?: string; // legacy
}

export type AuthedRequest = Request & { auth?: AuthPayload };

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.auth.jwtSecret) as AuthPayload;

    if (payload.token_type && payload.token_type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    (req as AuthedRequest).auth = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Returns true when the caller may access storeId (superadmin or store membership). */
export function canAccessStore(auth: AuthPayload | undefined, storeId: string): boolean {
  if (!auth || !storeId) return false;
  if (auth.role === 'superadmin') return true;
  if (auth.stores?.some((s) => s.store_id === storeId)) return true;
  // legacy single-store claim
  if (auth.storeId && auth.storeId === storeId) return true;
  return false;
}

export function assertStoreAccess(req: Request, res: Response, storeId: string): boolean {
  const auth = (req as AuthedRequest).auth;
  if (!canAccessStore(auth, storeId)) {
    res.status(403).json({ error: 'Forbidden: store access denied' });
    return false;
  }
  return true;
}
