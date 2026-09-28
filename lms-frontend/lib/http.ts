/** Parse a fetch Response body as JSON without throwing on HTML error pages. */
export async function readJson(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/** Human-readable message for a failed API response. */
export function apiErrorMessage(res: Response, data: any, fallback: string): string {
  const message = data?.message
  if (Array.isArray(message) && message.length) return message.join('. ')
  if (typeof message === 'string' && message && message !== 'Internal server error') return message
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return 'The server is waking up or temporarily unavailable. Please try again in a few seconds.'
  }
  if (res.status >= 500) return 'Something went wrong on our side. Please try again shortly.'
  return fallback
}
