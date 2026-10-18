import type { Request, Response, NextFunction } from 'express';

/**
 * Exact-match only. A `.onrender.com` suffix rule used to live here, but Render
 * hands out subdomains to anyone, so it let any attacker-controlled deployment
 * pass as a first-party origin — defeating both CORS and the mutation guard
 * below. Deployment origins belong in trustedOrigins() instead.
 */
export function isOriginTrusted(origin: string | undefined, origins: Set<string>): boolean {
  if (!origin) return false;
  return origins.has(origin);
}

export function trustedOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const configured = [env.FRONTEND_URL, ...(env.CORS_ORIGINS || '').split(',')];
  const local = env.NODE_ENV === 'production' ? [] : [3000, 3001, 3002].flatMap(port => [
    `http://localhost:${port}`, `http://127.0.0.1:${port}`,
  ]);
  return new Set([...configured, ...local, 'https://lms-0-id5t.onrender.com', 'https://160.187.169.41', 'http://160.187.169.41']
    .filter(Boolean).map(value => value!.trim()).filter(Boolean));
}

/** CORS alone does not prevent browser form submissions using ambient cookies. */
export function protectMutationOrigin(origins: Set<string>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && !isOriginTrusted(origin, origins)) return res.status(403).json({ message: 'Untrusted request origin' });
    if (!origin && req.cookies?.access_token) {
      const referer = req.get('referer');
      let refererOrigin: string | undefined;
      try { if (referer) refererOrigin = new URL(referer).origin; } catch { /* deny invalid URL */ }
      if (!refererOrigin || !isOriginTrusted(refererOrigin, origins)) {
        return res.status(403).json({ message: 'Cookie requests require a trusted Origin or Referer' });
      }
    }
    return next();
  };
}
