export const CP_STARTERS: Record<string, string> = {
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
};

const ALIASES: Record<string, string> = {
  python: 'python',
  python3: 'python',
  py: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  javascript: 'javascript',
  js: 'javascript',
  node: 'javascript',
};

export function toRuntimeLang(value?: string | null): string {
  return ALIASES[String(value || '').trim().toLowerCase()] || 'python';
}

export function starterForLanguage(codeSnippet: string | undefined | null, language: string): string {
  const runtime = toRuntimeLang(language);
  if (!codeSnippet?.trim()) return CP_STARTERS[runtime] || '';
  try {
    const parsed = JSON.parse(codeSnippet);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const direct = parsed[language] || parsed[runtime];
      if (typeof direct === 'string' && direct.trim()) return direct;
      for (const [key, value] of Object.entries(parsed)) {
        if (toRuntimeLang(key) === runtime && typeof value === 'string' && value.trim()) {
          return value;
        }
      }
    }
  } catch {
    return codeSnippet;
  }
  return CP_STARTERS[runtime] || '';
}
