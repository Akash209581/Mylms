import { API_URL } from './api'

/** Fetch JSON API resources with the same cookie session as the axios client and include Bearer token. */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return fetch(input, { ...init, headers, credentials: 'include' })
}

export { API_URL }
