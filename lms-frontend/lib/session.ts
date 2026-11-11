'use client'
import { api } from './api'

// One /auth/me request is shared by every component on a page and reused for a
// short time across tab changes, instead of each Navbar/page refetching it.
const FRESH_MS = 60_000
let cached: { user: any; at: number } | null = null
let inflight: Promise<any> | null = null
let generation = 0

export function getCurrentUser(options: { force?: boolean } = {}): Promise<any> {
  if (!options.force && cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached.user)
  if (inflight) return inflight
  const requestGeneration = generation
  const request = api.get('/auth/me')
    .then(response => {
      if (requestGeneration !== generation) throw new Error('Session changed while loading profile')
      cached = { user: response.data, at: Date.now() }
      try { localStorage.setItem('user', JSON.stringify(response.data)) } catch { /* storage unavailable */ }
      return response.data
    })
    .finally(() => { if (inflight === request) inflight = null })
  inflight = request
  return request
}

export function clearCurrentUser() {
  generation += 1
  cached = null
  inflight = null
}
