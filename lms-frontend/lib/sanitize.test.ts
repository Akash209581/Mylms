/** @jest-environment node */
import { execFileSync } from 'node:child_process'

// Use Node's real module loader for the production SSR path. Jest 29 cannot load
// the ESM dependencies used by current jsdom, which must not be mocked here.
function sanitizeHtml(html: string): string {
  return execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e',
    "import { sanitizeHtml } from './lib/sanitize.ts'; let input = ''; for await (const chunk of process.stdin) input += chunk; process.stdout.write(sanitizeHtml(input));"],
    { cwd: process.cwd(), input: html, encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' } })
}

describe('server-side lesson HTML', () => {
  it('removes stored scripts, event handlers and executable links before rendering', () => {
    const html = sanitizeHtml('<h2>Lesson</h2><script>alert(1)</script><img src="photo.png" onerror="alert(2)"><a href="javascript:alert(3)">link</a>')
    expect(html).toContain('<h2>Lesson</h2>')
    expect(html).not.toMatch(/script|onerror|javascript:|alert\(/)
  })
  it('preserves academic formatting and safe links', () => {
    expect(sanitizeHtml('<p><strong>Read</strong> <a href="https://example.com">notes</a></p>'))
      .toContain('<strong>Read</strong>')
  })
})
