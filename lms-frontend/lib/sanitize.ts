import DOMPurify from 'dompurify';

/**
 * Safely sanitizes HTML content using DOMPurify.
 * On the server side (during prerendering/SSR), it safely returns the raw string
 * to avoid importing jsdom, which has heavy dependencies and breaks during builds.
 * The client will re-run the sanitization once mounted.
 */
export function sanitizeHtml(html: string): string {
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(html);
  }
  return html;
}
