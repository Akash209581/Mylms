import DOMPurify from 'isomorphic-dompurify';

/**
 * Safely sanitizes HTML content using DOMPurify.
 * The same policy is applied before server rendering and in the browser.
 * Never place unsanitized stored content into the initial HTML response.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
