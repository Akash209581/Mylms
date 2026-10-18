'use client'
import React, { useState, useRef } from 'react'

export interface TestCaseItem {
  input: string
  output: string
  explanation?: string
  isHidden?: boolean
}

interface BulkTestCasesModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (testCases: TestCaseItem[], mode: 'replace' | 'append') => void
  existingCount: number
}

const SAMPLE_TEMPLATE = `=== TEST CASE 1 ===
Input:
5 10
Output:
15
Hidden: false
Explanation: 5 + 10 = 15

---

=== TEST CASE 2 ===
Input:
20 -5
Output:
15
Hidden: false
Explanation: 20 + (-5) = 15

---

=== TEST CASE 3 ===
Input:
1000 2000
Output:
3000
Hidden: true
Explanation: Large numbers test
`

export function parseBulkTestCasesText(rawText: string): TestCaseItem[] {
  if (!rawText || !rawText.trim()) return []
  const text = rawText.trim()

  // 1. Try parsing as JSON array
  if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
    try {
      const parsed = JSON.parse(text)
      const list = Array.isArray(parsed) ? parsed : [parsed]
      const results: TestCaseItem[] = []
      for (const item of list) {
        if (item && (item.input !== undefined || item.output !== undefined)) {
          results.push({
            input: String(item.input ?? '').trim(),
            output: String(item.output ?? item.expectedOutput ?? '').trim(),
            explanation: item.explanation ? String(item.explanation).trim() : '',
            isHidden: Boolean(item.isHidden ?? item.hidden ?? false),
          })
        }
      }
      if (results.length > 0) return results
    } catch {
      // Fall through to text block parsing
    }
  }

  // 2. Parse by separator blocks (e.g. "---", "===", or repeated "Input:")
  // Split on delimiters like "---", "___", or "=== ... ==="
  const blockDelim = /(?:^|\n)\s*(?:---|___|={3,}[^\n]*={0,3})\s*(?:\n|$)/g
  let blocks = text.split(blockDelim).map(b => b.trim()).filter(Boolean)

  // If no delimiter was used but multiple "Input:" or "input:" appear, split on "Input:"
  if (blocks.length <= 1 && (text.match(/(?:^|\n)\s*(?:Input|input|INPUT)\s*:/g) || []).length > 1) {
    blocks = text.split(/(?=(?:^|\n)\s*(?:Input|input|INPUT)\s*:)/g).map(b => b.trim()).filter(Boolean)
  }

  const results: TestCaseItem[] = []

  for (const block of blocks) {
    // Check if block has Input: and Output:
    const inputMatch = block.match(/(?:^|\n)\s*(?:Input|input|INPUT|stdin|STDIN)\s*:\s*([\s\S]*?)(?=(?:^|\n)\s*(?:Output|output|OUTPUT|Expected Output|expected output|stdout|STDOUT|Hidden|hidden|Explanation|explanation)\s*:|$)/i)
    const outputMatch = block.match(/(?:^|\n)\s*(?:Output|output|OUTPUT|Expected Output|expected output|stdout|STDOUT)\s*:\s*([\s\S]*?)(?=(?:^|\n)\s*(?:Hidden|hidden|Explanation|explanation)\s*:|$)/i)
    const hiddenMatch = block.match(/(?:^|\n)\s*(?:Hidden|hidden|HIDDEN|IsHidden|is_hidden)\s*:\s*(true|false|yes|no|1|0)/i)
    const expMatch = block.match(/(?:^|\n)\s*(?:Explanation|explanation|EXPLANATION|Reason|reason)\s*:\s*([\s\S]*?)$/i)

    if (inputMatch || outputMatch) {
      const input = inputMatch ? inputMatch[1].trim() : ''
      const output = outputMatch ? outputMatch[1].trim() : ''
      const isHidden = hiddenMatch ? ['true', 'yes', '1'].includes(hiddenMatch[1].toLowerCase()) : false
      const explanation = expMatch ? expMatch[1].trim() : ''

      results.push({ input, output, explanation, isHidden })
      continue
    }

    // 3. Fallback: check if single-line delimited (e.g. pipe or tab separated: "input | output" or "input | output | hidden")
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('//')) continue // comment line
      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim())
        if (parts.length >= 2) {
          const input = parts[0]
          const output = parts[1]
          const isHidden = parts[2] ? ['true', 'yes', 'hidden', '1'].includes(parts[2].toLowerCase()) : false
          const explanation = parts[3] || ''
          results.push({ input, output, explanation, isHidden })
        }
      } else if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim())
        if (parts.length >= 2) {
          const input = parts[0]
          const output = parts[1]
          const isHidden = parts[2] ? ['true', 'yes', 'hidden', '1'].includes(parts[2].toLowerCase()) : false
          results.push({ input, output, explanation: '', isHidden })
        }
      }
    }
  }

  return results
}

export default function BulkTestCasesModal({
  isOpen,
  onClose,
  onApply,
  existingCount,
}: BulkTestCasesModalProps) {
  const [rawText, setRawText] = useState('')
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const parsed = parseBulkTestCasesText(rawText)
  const normalCount = parsed.filter(tc => !tc.isHidden).length
  const hiddenCount = parsed.filter(tc => tc.isHidden).length

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = evt => {
      const content = evt.target?.result as string
      setRawText(content)
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_TEMPLATE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_TEMPLATE], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sample_testcases.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleApply = () => {
    if (parsed.length === 0) return
    onApply(parsed, mode)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121620] border border-white/10 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-xl">
              🧪
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Bulk Add Test Cases
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Paste or upload a text file with multiple test cases at once
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xl"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0 text-sm">
          {/* Action bar: Upload File & Template buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white/[0.03] rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt,.json,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-lg bg-primary-500 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-primary-600 transition-colors shadow-sm"
              >
                📁 Upload .txt / .json File
              </button>
              <span className="text-xs text-gray-400">or paste content directly below</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-medium transition-colors"
              >
                {copied ? '✓ Copied Format!' : '📋 Copy Sample Template'}
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-medium transition-colors"
              >
                ⬇ Download Template (.txt)
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                Paste Test Cases (Text, JSON, or Delimited)
              </label>
              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Clear Text
                </button>
              )}
            </div>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`Input:\n5 10\nOutput:\n15\nHidden: false\nExplanation: 5 + 10 = 15\n\n---\n\nInput:\n20 30\nOutput:\n50\nHidden: true`}
              rows={8}
              className="w-full p-4 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-emerald-400 focus:outline-none focus:border-primary-500 leading-relaxed resize-y shadow-inner"
            />
          </div>

          {/* Parse Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Parsed Results:
              </span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                parsed.length > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/5 text-gray-400'
              }`}>
                {parsed.length} Test Case{parsed.length === 1 ? '' : 's'} Detected
              </span>
              {parsed.length > 0 && (
                <>
                  <span className="text-xs text-emerald-400">🟢 {normalCount} Normal</span>
                  <span className="text-xs text-rose-400">🔒 {hiddenCount} Hidden</span>
                </>
              )}
            </div>

            {/* Mode selection: Replace vs Append */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-400">Mode:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 select-none">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="text-primary-500"
                />
                <span>Replace Existing ({existingCount})</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 select-none">
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={mode === 'append'}
                  onChange={() => setMode('append')}
                  className="text-primary-500"
                />
                <span>Append to Existing</span>
              </label>
            </div>
          </div>

          {/* Parsed Preview Table */}
          {parsed.length > 0 && (
            <div className="border border-white/10 rounded-xl overflow-hidden shadow-sm">
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/5 text-gray-300 uppercase text-[10px] tracking-wider sticky top-0 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3 w-28">Type</th>
                      <th className="py-2.5 px-3">Input</th>
                      <th className="py-2.5 px-3">Output</th>
                      <th className="py-2.5 px-3">Explanation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/20">
                    {parsed.map((tc, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-center text-gray-500">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tc.isHidden
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {tc.isHidden ? '🔒 Hidden' : '🟢 Normal'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-indigo-300 max-w-[200px] truncate" title={tc.input}>
                          {tc.input || <span className="text-gray-600 italic">(empty)</span>}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-300 max-w-[200px] truncate" title={tc.output}>
                          {tc.output || <span className="text-gray-600 italic">(empty)</span>}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 max-w-[180px] truncate" title={tc.explanation}>
                          {tc.explanation || <span className="text-gray-600 italic">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-between items-center">
          <p className="text-xs text-gray-400">
            {parsed.length > 0
              ? `Ready to ${mode === 'replace' ? 'replace' : 'append'} ${parsed.length} test case(s).`
              : 'Paste test cases or upload a file to begin.'}
          </p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={parsed.length === 0}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Apply {parsed.length} Test Case{parsed.length === 1 ? '' : 's'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
