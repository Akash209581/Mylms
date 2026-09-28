'use client'
import { api } from './api'

// One /auth/me request is shared by every component on a page and reused for a
// short time across tab changes, instead of each Navbar/page refetching it.
const FRESH_MS = 60_000
let cached: { user: any; at: number } | null = null
let inflight: Promise<any> | null = null

export function getCurrentUser(options: { force?: boolean } = {}): Promise<any> {
  if (!options.force && cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached.user)
  if (inflight) return inflight
  inflight = api.get('/auth/me')
    .then(response => {
      cached = { user: response.data, at: Date.now() }
      try { localStorage.setItem('user', JSON.stringify(response.data)) } catch { /* storage unavailable */ }
      return response.data
    })
    .finally(() => { inflight = null })
  return inflight
}

export function clearCurrentUser() {
  cached = null
  inflight = null
}
