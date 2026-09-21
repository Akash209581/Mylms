'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode2,
  Maximize2,
  Minimize2,
  Trash2,
  BookOpen,
  Code2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { CP_STARTERS } from '@/lib/starter-code'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-[var(--text-muted)] font-mono text-sm">
      Loading editor…
    </div>
  ),
})

interface LanguageOption {
  key: string
  label: string
  monacoLang: string
  extension: string
  version: string
  defaultCode: string
}

const LANGUAGES: LanguageOption[] = [
  { key: 'python', label: 'Python 3', monacoLang: 'python', extension: 'py', version: '3.11', defaultCode: CP_STARTERS.python },
  { key: 'java', label: 'Java 17', monacoLang: 'java', extension: 'java', version: '17', defaultCode: CP_STARTERS.java },
  { key: 'c', label: 'C (GCC 13)', monacoLang: 'c', extension: 'c', version: '13.2.0', defaultCode: CP_STARTERS.c },
  { key: 'cpp', label: 'C++ (G++ 13)', monacoLang: 'cpp', extension: 'cpp', version: '13.2.0', defaultCode: CP_STARTERS.cpp },
  { key: 'javascript', label: 'JavaScript', monacoLang: 'javascript', extension: 'js', version: 'Node 20', defaultCode: CP_STARTERS.javascript },
]

interface PracticeChallenge {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[]
  description: string
  sampleInput: string
  sampleOutput: string
  snippets: Record<string, string>
}

const PRACTICE_CHALLENGES: PracticeChallenge[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Arrays'],
    description: 'Read numbers then a target. Print the two indices that add up to the target.',
    sampleInput: '2 7 11 15\n9',
    sampleOutput: '0 1',
    snippets: {
      python: `nums = list(map(int, input().split()))
target = int(input())
seen = {}
for i, num in enumerate(nums):
    if target - num in seen:
        print(seen[target - num], i)
        break
    seen[num] = i
`,
      java: `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int target = sc.nextInt();
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < parts.length; i++) {
            int num = Integer.parseInt(parts[i]);
            if (seen.containsKey(target - num)) {
                System.out.println(seen.get(target - num) + " " + i);
                return;
            }
            seen.put(num, i);
        }
    }
}
`,
      c: `#include <stdio.h>
int main() {
    int nums[100], n = 0, target, x;
    while (scanf("%d", &x) == 1) nums[n++] = x;
    if (n < 2) return 0;
    target = nums[--n];
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if (nums[i] + nums[j] == target) {
                printf("%d %d\\n", i, j);
                return 0;
            }
    return 0;
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    vector<int> nums;
    int x;
    while (cin >> x) nums.push_back(x);
    if (nums.size() < 2) return 0;
    int target = nums.back(); nums.pop_back();
    unordered_map<int,int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        if (seen.count(target - nums[i])) {
            cout << seen[target - nums[i]] << " " << i << "\\n";
            return 0;
        }
        seen[nums[i]] = i;
    }
}
`,
      javascript: `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\n/);
const nums = lines[0].trim().split(/\\s+/).map(Number);
const target = Number(lines[1]);
const seen = new Map();
for (let i = 0; i < nums.length; i++) {
  if (seen.has(target - nums[i])) {
    console.log(seen.get(target - nums[i]), i);
    break;
  }
  seen.set(nums[i], i);
}
`,
    },
  },
  {
    id: 'reverse-string',
    title: 'Reverse a string',
    difficulty: 'Easy',
    tags: ['Strings'],
    description: 'Read a string, print the reverse, and whether it is a palindrome.',
    sampleInput: 'racecar',
    sampleOutput: 'Reversed: racecar\nIs Palindrome: YES',
    snippets: {
      python: `s = input().strip()
rev = s[::-1]
print("Reversed:", rev)
print("Is Palindrome:", "YES" if s.lower() == rev.lower() else "NO")
`,
      java: `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        String rev = new StringBuilder(s).reverse().toString();
        System.out.println("Reversed: " + rev);
        System.out.println("Is Palindrome: " + (s.equalsIgnoreCase(rev) ? "YES" : "NO"));
    }
}
`,
      c: `#include <stdio.h>
#include <string.h>
int main() {
    char s[256], rev[256];
    scanf("%255s", s);
    int len = (int)strlen(s);
    for (int i = 0; i < len; i++) rev[i] = s[len - 1 - i];
    rev[len] = '\\0';
    printf("Reversed: %s\\n", rev);
    printf("Is Palindrome: %s\\n", strcmp(s, rev) == 0 ? "YES" : "NO");
    return 0;
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    string s; cin >> s;
    string rev = s;
    reverse(rev.begin(), rev.end());
    cout << "Reversed: " << rev << "\\n";
    cout << "Is Palindrome: " << (s == rev ? "YES" : "NO") << "\\n";
}
`,
      javascript: `const s = require('fs').readFileSync(0, 'utf8').trim();
const rev = s.split('').reverse().join('');
console.log('Reversed:', rev);
console.log('Is Palindrome:', s.toLowerCase() === rev.toLowerCase() ? 'YES' : 'NO');
`,
    },
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci',
    difficulty: 'Easy',
    tags: ['Math'],
    description: 'Read N and print the first N Fibonacci numbers.',
    sampleInput: '10',
    sampleOutput: '0 1 1 2 3 5 8 13 21 34',
    snippets: {
      python: `n = int(input())
a, b = 0, 1
out = []
for _ in range(n):
    out.append(str(a))
    a, b = b, a + b
print(" ".join(out))
`,
      java: `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long a = 0, b = 1;
        for (int i = 0; i < n; i++) {
            System.out.print(a + (i + 1 == n ? "\\n" : " "));
            long next = a + b; a = b; b = next;
        }
    }
}
`,
      c: `#include <stdio.h>
int main() {
    int n; scanf("%d", &n);
    long long a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        printf("%lld%c", a, i + 1 == n ? '\\n' : ' ');
        long long next = a + b; a = b; b = next;
    }
    return 0;
}
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    long long a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        cout << a << (i + 1 == n ? "\\n" : " ");
        long long next = a + b; a = b; b = next;
    }
}
`,
      javascript: `const n = parseInt(require('fs').readFileSync(0, 'utf8').trim(), 10);
let a = 0n, b = 1n, out = [];
for (let i = 0; i < n; i++) { out.push(a.toString()); const next = a + b; a = b; b = next; }
console.log(out.join(' '));
`,
    },
  },
]

function tabClass(active: boolean) {
  return `px-3 py-2 text-xs font-semibold border-b-2 ${
    active
      ? 'border-[var(--accent)] text-[var(--accent-text)]'
      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
  }`
}

function codeRequiresInput(source: string, lang: string): boolean {
  if (!source) return false
  const patterns: Record<string, RegExp[]> = {
    python: [/\binput\s*\(/, /\bsys\.stdin\b/],
    c: [/\bscanf\s*\(/, /\bgetchar\s*\(/, /\bgets\s*\(/, /\bfgets\s*\(/, /\bread\s*\(/],
    cpp: [/\bcin\s*>>/, /\bgetline\s*\(/, /\bscanf\s*\(/],
    java: [/\bScanner\b/, /\bBufferedReader\b/, /\bSystem\.in\b/],
    javascript: [/\breadFileSync\s*\(\s*0/, /\breadline\b/, /\bprocess\.stdin\b/],
  }
  const regexes = patterns[lang] || [/input\s*\(/, /scanf\s*\(/, /cin\s*>>/]
  return regexes.some((re) => re.test(source))
}

export default function StudentIdePage() {
  const [selectedLangKey, setSelectedLangKey] = useState('python')
  const [code, setCode] = useState(CP_STARTERS.python)
  const [stdin, setStdin] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'challenges' | 'reference'>('output')
  const [fontSize, setFontSize] = useState(14)
  const [isRunning, setIsRunning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showInputModal, setShowInputModal] = useState(false)
  const [modalInputVal, setModalInputVal] = useState('')
  const [outputResult, setOutputResult] = useState<{
    stdout?: string
    stderr?: string
    status?: string
    exitCode?: number
    executionTimeMs?: number
    compilationError?: string
    error?: string
  } | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const currentLang = LANGUAGES.find((l) => l.key === selectedLangKey) || LANGUAGES[0]
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<{ getValue: () => string } | null>(null)
  const inputModalRef = useRef<HTMLTextAreaElement>(null)

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }, [])

  useEffect(() => {
    const savedLang = localStorage.getItem('student_ide_selected_language')
    if (savedLang && LANGUAGES.some((l) => l.key === savedLang)) setSelectedLangKey(savedLang)
  }, [])

  useEffect(() => {
    const savedCode = localStorage.getItem(`student_ide_code_${selectedLangKey}`)
    const savedStdin = localStorage.getItem(`student_ide_stdin_${selectedLangKey}`)
    setCode(savedCode || currentLang.defaultCode)
    setStdin(savedStdin || '')
    localStorage.setItem('student_ide_selected_language', selectedLangKey)
    setHydrated(true)
  }, [selectedLangKey, currentLang.defaultCode])

  const handleCodeChange = (val: string | undefined) => {
    if (typeof val !== 'string' || !val.trim()) return
    setCode(val)
    localStorage.setItem(`student_ide_code_${selectedLangKey}`, val)
  }

  const handleStdinChange = (val: string) => {
    setStdin(val)
    localStorage.setItem(`student_ide_stdin_${selectedLangKey}`, val)
  }

  const handleResetTemplate = () => {
    if (!window.confirm(`Reset ${currentLang.label} to the starter template?`)) return
    setCode(currentLang.defaultCode)
    localStorage.setItem(`student_ide_code_${selectedLangKey}`, currentLang.defaultCode)
    showToast('Starter restored')
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      showToast('Copied')
      setTimeout(() => setCopied(false), 1600)
    } catch {
      showToast('Copy failed')
    }
  }

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `solution.${currentLang.extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleLoadChallenge = (ch: PracticeChallenge) => {
    const snippet = ch.snippets[selectedLangKey] || ch.snippets.python || currentLang.defaultCode
    setCode(snippet)
    setStdin(ch.sampleInput)
    localStorage.setItem(`student_ide_code_${selectedLangKey}`, snippet)
    localStorage.setItem(`student_ide_stdin_${selectedLangKey}`, ch.sampleInput)
    setActiveTab('input')
    showToast(`Loaded ${ch.title}`)
  }

  const runState = useRef({ code, stdin, selectedLangKey, isRunning })
  runState.current = { code, stdin, selectedLangKey, isRunning }

  const executeCodeWithStdin = async (finalStdin: string) => {
    const snap = runState.current
    const source = (editorRef.current?.getValue?.() || snap.code || '').trim() ? (editorRef.current?.getValue?.() || snap.code) : ''
    const language = snap.selectedLangKey || 'python'
    if (snap.isRunning) return
    if (!source.trim()) {
      showToast('Write some code first')
      return
    }
    setIsRunning(true)
    setActiveTab('output')
    setOutputResult({ status: 'RUNNING' })
    const startTime = Date.now()
    try {
      const res = await api.post('/compiler/run', { language, code: source, stdin: finalStdin })
      const data = res.data
      if (data.status === 'QUEUED' || data.status === 'RUNNING') {
        const jobId = data.jobId
        let done = false
        for (let i = 0; i < 25 && !done; i++) {
          await new Promise((r) => setTimeout(r, 600))
          const poll = await api.get(`/compiler/status/${jobId}`)
          if (poll.data.status && poll.data.status !== 'QUEUED' && poll.data.status !== 'RUNNING') {
            setOutputResult(poll.data)
            done = true
          }
        }
        if (!done) {
          setOutputResult({
            status: 'TIME_LIMIT_EXCEEDED',
            stderr: 'Execution timed out waiting for the queue.',
            executionTimeMs: Date.now() - startTime,
          })
        }
      } else {
        setOutputResult(data)
      }
    } catch (err: any) {
      setOutputResult({
        status: 'SYSTEM_ERROR',
        stderr: err?.response?.data?.message || err?.message || 'Failed to execute code.',
        executionTimeMs: Date.now() - startTime,
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleRunCode = async () => {
    const snap = runState.current
    const source = (editorRef.current?.getValue?.() || snap.code || '').trim() ? (editorRef.current?.getValue?.() || snap.code) : ''
    const language = snap.selectedLangKey || 'python'

    // If code expects input and no stdin has been provided yet, open prompt modal
    if (codeRequiresInput(source, language) && (!snap.stdin || !snap.stdin.trim())) {
      setModalInputVal('')
      setShowInputModal(true)
      setTimeout(() => inputModalRef.current?.focus(), 100)
      return
    }

    await executeCodeWithStdin(snap.stdin || '')
  }

  const handleModalSubmit = (useInput: boolean) => {
    const chosenInput = useInput ? modalInputVal : ''
    setStdin(chosenInput)
    localStorage.setItem(`student_ide_stdin_${selectedLangKey}`, chosenInput)
    setShowInputModal(false)
    executeCodeWithStdin(chosenInput)
  }

  const runRef = useRef(handleRunCode)
  runRef.current = handleRunCode

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        runRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const status = outputResult?.status

  return (
    <div
      ref={containerRef}
      className={`h-screen overflow-hidden flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {toastMsg && (
        <div className="absolute top-3 right-4 z-50 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)]">
          {toastMsg}
        </div>
      )}

      {/* Interactive Input (stdin) Prompt Modal */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 font-bold">
                  <Terminal className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Program Input Required</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Your code uses standard input (e.g. input() / scanf / cin)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInputModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Enter input values (stdin):</label>
              <textarea
                ref={inputModalRef}
                value={modalInputVal}
                onChange={(e) => setModalInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault()
                    handleModalSubmit(true)
                  }
                }}
                placeholder="e.g. 4 or 10 20"
                rows={4}
                className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <span className="text-[10px] text-[var(--text-muted)]">Tip: Press Ctrl+Enter or click Run Program to execute</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => handleModalSubmit(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Run Without Input
              </button>
              <button
                type="button"
                onClick={() => handleModalSubmit(true)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 shadow-md"
              >
                Run Program (Output)
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/dashboard/student" className="text-xs font-semibold px-2 py-1 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Dashboard
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)]">
            <Code2 className="w-3.5 h-3.5" />
            Practice IDE
          </span>
          <select
            value={selectedLangKey}
            onChange={(e) => setSelectedLangKey(e.target.value)}
            className="text-xs font-semibold px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text-primary)]"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.key} value={lang.key}>{lang.label} ({lang.version})</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setActiveTab('challenges')} className={tabClass(activeTab === 'challenges')}>
            Challenges
          </button>
          <div className="hidden md:flex items-center gap-1 text-[11px] text-[var(--text-muted)] px-1">
            {[12, 14, 16, 18].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                className={`px-1.5 py-0.5 rounded ${fontSize === size ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] font-bold' : ''}`}
              >
                {size}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleResetTemplate} title="Reset starter" className="p-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)]">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={handleCopyCode} title="Copy" className="p-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)]">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button type="button" onClick={handleDownloadCode} title="Download" className="p-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)]">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={toggleFullscreen} title="Fullscreen" className="p-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)]">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[var(--accent)] text-white disabled:opacity-60"
          >
            {isRunning ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {isRunning ? 'Running' : 'Run'}
            <span className="hidden lg:inline font-mono text-[10px] opacity-80">Ctrl+Enter</span>
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <section className="flex-1 min-h-0 min-w-0 flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border)]">
          <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-[var(--bg-surface)] border-b border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5" />
              solution.{currentLang.extension}
            </span>
            <span>{code.split('\n').length} lines</span>
          </div>
          <div className="flex-1 min-h-0 bg-[#1e1e1e]">
            {hydrated && (
            <MonacoEditor
              height="100%"
              language={currentLang.monacoLang}
              value={code}
              theme="vs-dark"
              onChange={handleCodeChange}
              onMount={(editor) => { editorRef.current = editor }}
              options={{
                fontSize,
                fontFamily: "Consolas, 'Courier New', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                formatOnPaste: false,
                formatOnType: false,
                cursorBlinking: 'solid',
                cursorSmoothCaretAnimation: 'off',
                smoothScrolling: false,
                lineNumbers: 'on',
                renderWhitespace: 'none',
                overviewRulerBorder: false,
                padding: { top: 10, bottom: 10 },
              }}
            />
            )}
          </div>
        </section>

        <aside className="w-full h-[38%] lg:h-auto lg:w-[400px] xl:w-[440px] shrink-0 min-h-0 flex flex-col bg-[var(--bg-surface)]">
          <div className="shrink-0 flex items-center justify-between px-2 border-b border-[var(--border)]">
            <div className="flex">
              <button type="button" onClick={() => setActiveTab('output')} className={tabClass(activeTab === 'output')}>
                <span className="inline-flex items-center gap-1"><Terminal className="w-3.5 h-3.5" /> Output</span>
              </button>
              <button type="button" onClick={() => setActiveTab('input')} className={tabClass(activeTab === 'input')}>
                Input
              </button>
              <button type="button" onClick={() => setActiveTab('challenges')} className={tabClass(activeTab === 'challenges')}>
                Challenges
              </button>
              <button type="button" onClick={() => setActiveTab('reference')} className={tabClass(activeTab === 'reference')}>
                <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Guide</span>
              </button>
            </div>
            {activeTab === 'output' && outputResult && (
              <button type="button" onClick={() => setOutputResult(null)} className="px-2 py-1 text-[11px] text-[var(--text-muted)]">
                <Trash2 className="w-3 h-3 inline" /> Clear
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {activeTab === 'output' && (
              <div className="h-full flex flex-col gap-2">
                {outputResult && (
                  <div className="text-xs flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      {status === 'RUNNING' && <><span className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /> Running…</>}
                      {status === 'ACCEPTED' && <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Finished</>}
                      {status === 'COMPILATION_ERROR' && <><XCircle className="w-4 h-4 text-red-600" /> Compilation error</>}
                      {status === 'RUNTIME_ERROR' && <><AlertTriangle className="w-4 h-4 text-amber-600" /> Runtime error</>}
                      {status === 'TIME_LIMIT_EXCEEDED' && <><Clock className="w-4 h-4 text-amber-600" /> Timed out</>}
                      {status === 'SYSTEM_ERROR' && <><XCircle className="w-4 h-4 text-red-600" /> System error</>}
                    </span>
                    {outputResult.executionTimeMs != null && status !== 'RUNNING' && (
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">{outputResult.executionTimeMs}ms</span>
                    )}
                  </div>
                )}
                <div className="flex-1 min-h-[180px] rounded-md border border-[var(--border)] bg-[#111827] p-3 font-mono text-xs text-slate-200 overflow-auto">
                  {!outputResult && <p className="text-slate-500">Run code or press Ctrl+Enter. Stdout and errors appear here.</p>}
                  {status === 'RUNNING' && <p className="text-sky-300">Executing in the sandbox…</p>}
                  {outputResult?.compilationError && <pre className="text-red-300 whitespace-pre-wrap">{outputResult.compilationError}</pre>}
                  {outputResult?.stdout != null && status !== 'RUNNING' && (
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 mb-1">Stdout</p>
                      <pre className="text-emerald-300 whitespace-pre-wrap">{outputResult.stdout || '(empty)'}</pre>
                    </div>
                  )}
                  {outputResult?.stderr && !outputResult?.compilationError && (
                    <div className="mt-2">
                      <p className="text-[10px] uppercase text-amber-400 mb-1">Stderr</p>
                      <pre className="text-amber-200 whitespace-pre-wrap">{outputResult.stderr}</pre>
                    </div>
                  )}
                  {outputResult?.error && !outputResult?.stderr && !outputResult?.compilationError && (
                    <pre className="text-amber-200 whitespace-pre-wrap">{outputResult.error}</pre>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'input' && (
              <div className="h-full flex flex-col gap-2">
                <p className="text-xs text-[var(--text-muted)]">Stdin is piped to the program. Example for the default starter: <code className="font-mono">21</code></p>
                <textarea
                  value={stdin}
                  onChange={(e) => handleStdinChange(e.target.value)}
                  placeholder={'21'}
                  className="flex-1 min-h-[180px] w-full p-3 rounded-md border border-[var(--border)] bg-[var(--bg-raised)] font-mono text-xs text-[var(--text-primary)]"
                />
              </div>
            )}

            {activeTab === 'challenges' && (
              <div className="space-y-2">
                {PRACTICE_CHALLENGES.map((ch) => (
                  <div key={ch.id} className="p-3 rounded-md border border-[var(--border)] bg-[var(--bg-raised)]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold">{ch.title}</p>
                      <span className="text-[10px] font-semibold text-[var(--accent-text)]">{ch.difficulty}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">{ch.description}</p>
                    <button
                      type="button"
                      onClick={() => handleLoadChallenge(ch)}
                      className="text-xs font-semibold text-[var(--accent-text)]"
                    >
                      Load starter
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reference' && (
              <div className="space-y-3 text-xs">
                <p className="text-[var(--text-muted)]">Read from stdin with the normal language APIs. The sandbox pipes input; you do not need sys.stdin unless you choose it.</p>
                <pre className="p-2 rounded-md bg-[var(--bg-raised)] border border-[var(--border)] font-mono">{`Python: n = int(input())
Java:   Scanner sc = new Scanner(System.in)
C:      scanf("%d", &n)
C++:    cin >> n
Node:   fs.readFileSync(0, 'utf8')`}</pre>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
