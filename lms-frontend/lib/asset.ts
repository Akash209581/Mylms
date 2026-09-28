// Plain <img> tags and CSS url()s are not rewritten by Next's basePath, so
// public assets must be prefixed explicitly.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

export const asset = (path: string) => `${BASE_PATH}${path}`
