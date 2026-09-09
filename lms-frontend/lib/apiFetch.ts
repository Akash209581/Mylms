import { API_URL } from './api'

/** Fetch JSON API resources with the same cookie session as the axios client. */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, { ...init, credentials: 'include' })
}

export { API_URL }
