import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';

const CSRF_COOKIE = 'pf_csrf';
const CSRF_HEADER = 'x-csrf-token';

export function setCsrfCookie(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
    });
  }
  next();
}

export function verifyCsrf(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }
  next();
}

export function getCsrfToken(req: Request, res: Response) {
  const token = req.cookies?.[CSRF_COOKIE] ?? (() => {
    const t = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, t, { httpOnly: false, sameSite: 'lax' });
    return t;
  })();
  res.json({ token });
}
