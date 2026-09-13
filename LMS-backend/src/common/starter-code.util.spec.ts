import { starterForLanguage, toRuntimeLang } from './starter-code.util';

describe('starter-code.util', () => {
  it('maps display names to runtime keys', () => {
    expect(toRuntimeLang('Python')).toBe('python');
    expect(toRuntimeLang('C++')).toBe('cpp');
    expect(toRuntimeLang('JavaScript')).toBe('javascript');
  });

  it('reads a per-language JSON map', () => {
    const snippet = JSON.stringify({ Python: 'print(1)', java: 'class Main {}' });
    expect(starterForLanguage(snippet, 'python')).toBe('print(1)');
    expect(starterForLanguage(snippet, 'Java')).toBe('class Main {}');
  });

  it('keeps a plain string snippet for legacy questions', () => {
    expect(starterForLanguage('print("hi")', 'python')).toBe('print("hi")');
  });

  it('falls back to competitive-programming python starter', () => {
    expect(starterForLanguage('', 'python')).toContain('int(input())');
  });
});
