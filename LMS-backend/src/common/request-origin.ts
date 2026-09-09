import type { Request, Response, NextFunction } from 'express';

export function trustedOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const configured = [env.FRONTEND_URL, ...(env.CORS_ORIGINS || '').split(',')];
  const local = env.NODE_ENV === 'production' ? [] : [3000, 3001, 3002].flatMap(port => [
    `http://localhost:${port}`, `http://127.0.0.1:${port}`,
  ]);
  return new Set([...configured, ...local, 'https://lms-0-id5t.onrender.com']
    .filter(Boolean).map(value => value!.trim()).filter(Boolean));
}

/** CORS alone does not prevent browser form submissions using ambient cookies. */
export function protectMutationOrigin(origins: Set<string>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && !origins.has(origin)) return res.status(403).json({ message: 'Untrusted request origin' });
    if (!origin && req.cookies?.access_token) {
      const referer = req.get('referer');
      let refererOrigin: string | undefined;
      try { if (referer) refererOrigin = new URL(referer).origin; } catch { /* deny invalid URL */ }
      if (!refererOrigin || !origins.has(refererOrigin)) {
        return res.status(403).json({ message: 'Cookie requests require a trusted Origin or Referer' });
      }
    }
    return next();
  };
}
