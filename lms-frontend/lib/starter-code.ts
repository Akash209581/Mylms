export const RUNTIME_LANG_KEYS = ['python', 'java', 'c', 'cpp', 'javascript'] as const
export type RuntimeLang = (typeof RUNTIME_LANG_KEYS)[number]

const DISPLAY_TO_RUNTIME: Record<string, RuntimeLang> = {
  python: 'python',
  python3: 'python',
  py: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cxx: 'cpp',
  javascript: 'javascript',
  js: 'javascript',
  node: 'javascript',
}

export const CP_STARTERS: Record<RuntimeLang, string> = {
  python: `n = int(input())
print(n * 2)
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        System.out.println(n * 2);
    }
}
`,
  c: `#include <stdio.h>

int main() {
    int n;
    scanf("%d", &n);
    printf("%d\\n", n * 2);
    return 0;
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    cout << n * 2 << "\\n";
    return 0;
}
`,
  javascript: `const fs = require('fs');
const n = parseInt(fs.readFileSync(0, 'utf8').trim(), 10);
console.log(n * 2);
`,
}

export const ADMIN_STARTERS: Record<string, string> = {
  Python: `n = int(input())
print(n * 2)
`,
  Java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        System.out.println(n * 2);
    }
}
`,
  C: `#include <stdio.h>

int main() {
    int n;
    scanf("%d", &n);
    printf("%d\\n", n * 2);
    return 0;
}
`,
  'C++': `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    cout << n * 2 << "\\n";
    return 0;
}
`,
  JavaScript: `const fs = require('fs');
const n = parseInt(fs.readFileSync(0, 'utf8').trim(), 10);
console.log(n * 2);
`,
}

export function toRuntimeLang(value?: string | null): RuntimeLang {
  const key = String(value || '').trim().toLowerCase()
  return DISPLAY_TO_RUNTIME[key] || 'python'
}

export function parseStarterMap(codeSnippet?: string | null): Record<string, string> {
  if (!codeSnippet?.trim()) return {}
  try {
    const parsed = JSON.parse(codeSnippet)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') out[k] = v
      }
      return out
    }
  } catch {
    return { _plain: codeSnippet }
  }
  return { _plain: codeSnippet }
}

export function starterForLanguage(
  codeSnippet: string | undefined | null,
  language: string,
  fallback = true,
): string {
  const runtime = toRuntimeLang(language)
  const map = parseStarterMap(codeSnippet)
  if (map._plain) return map._plain

  const aliases = [
    language,
    runtime,
    runtime === 'python' ? 'Python' : '',
    runtime === 'java' ? 'Java' : '',
    runtime === 'c' ? 'C' : '',
    runtime === 'cpp' ? 'C++' : '',
    runtime === 'javascript' ? 'JavaScript' : '',
  ].filter(Boolean)

  for (const alias of aliases) {
    if (map[alias]?.trim()) return map[alias]
  }

  const match = Object.entries(map).find(
    ([key]) => toRuntimeLang(key) === runtime && map[key]?.trim(),
  )
  if (match) return match[1]
  return fallback ? CP_STARTERS[runtime] : ''
}

export function hasPerLanguageStarters(codeSnippet?: string | null): boolean {
  const map = parseStarterMap(codeSnippet)
  return Object.keys(map).some((k) => k !== '_plain' && map[k]?.trim())
}
