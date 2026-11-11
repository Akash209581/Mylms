/** @jest-environment node */
import { execFileSync, spawnSync } from 'child_process'
import { parseCodeTrace, pythonTraceProgram } from './code-trace'

const hasPython = spawnSync('python', ['--version']).status === 0
const pythonTest = hasPython ? test : test.skip
function run(source: string, input = '') {
  return parseCodeTrace(execFileSync('python', ['-c', pythonTraceProgram(source)], { input, timeout: 5000 }).toString())
}

pythonTest('captures loop values and cumulative output from real execution', () => {
  const trace = run('total = 0\nfor n in [2, 3]:\n    total += n\nprint(total)')
  expect(trace.error).toBe('')
  expect(trace.steps.at(-1)?.variables.total).toBe(5)
  expect(trace.steps.at(-1)?.output).toBe('5\n')
  expect(trace.steps.filter(s => s.line === 3)).toHaveLength(2)
})

pythonTest('captures input, arrays, function scopes and unicode', () => {
  const trace = run('def double(n):\n    return n * 2\nitems = [double(int(input()))]\nprint("✓", items)', '4\n')
  expect(trace.steps.some(s => s.scope === 'double' && s.variables.n === 4)).toBe(true)
  expect(trace.steps.at(-1)?.variables.items).toEqual([8])
  expect(trace.steps.at(-1)?.output).toBe('✓ [8]\n')
})

pythonTest('reports runtime and syntax errors without inventing successful execution', () => {
  expect(run('x = 1\ny = 1 / 0').error).toContain('ZeroDivisionError')
  const invalid = run('if :')
  expect(invalid.steps).toHaveLength(0)
  expect(invalid.error).toContain('SyntaxError')
})

pythonTest('bounds infinite loops and cyclic collections', () => {
  const trace = run('a = []\na.append(a)\nwhile True:\n    pass')
  expect(trace.truncated).toBe(true)
  expect(trace.steps.length).toBeLessThanOrEqual(150)
  expect(trace.error).toContain('TraceLimit')
})

test('rejects malformed runner output', () => {
  expect(() => parseCodeTrace('{"steps":[{}]}')).toThrow('invalid trace')
})
