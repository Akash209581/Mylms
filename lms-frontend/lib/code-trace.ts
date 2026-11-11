export type TraceStep = { line: number; event: string; scope: string; variables: Record<string, unknown>; output: string }
export type CodeTrace = { steps: TraceStep[]; error: string; truncated: boolean }

/** Instrumentation runs inside the existing Python sandbox, never in the browser. */
export function pythonTraceProgram(source: string): string {
  const bytes = Array.from(new TextEncoder().encode(source))
  return `import sys, io, json
source = bytes(${JSON.stringify(bytes)}).decode('utf-8')
steps = []
budget = 0
truncated = False
error = ''
original_stdout = sys.stdout
class TraceLimit(Exception): pass
class Output(io.StringIO):
    def write(self, value):
        if self.tell() + len(value) > 4000: raise TraceLimit('Output limit reached')
        return super().write(value)
output = Output()
def value_view(value, depth=0):
    if type(value) in (int, float, bool, type(None)): return str(value) if type(value) is float else value
    if type(value) is str: return value[:120]
    if depth < 2 and type(value) in (list, tuple): return [value_view(v, depth+1) for v in value[:16]]
    if depth < 2 and type(value) is dict: return {str(k)[:40]: value_view(v, depth+1) for k,v in list(value.items())[:12] if type(k) in (str,int,float,bool)}
    return '<' + type(value).__name__ + '>'
def trace(frame, event, arg):
    global budget, truncated
    if frame.f_code.co_filename != '<student>': return trace
    if event not in ('line', 'return'): return trace
    if len(steps) >= 150 or budget > 28000:
        truncated = True
        raise TraceLimit('Trace limit reached; try a smaller input')
    variables = {k: value_view(v) for k,v in list(frame.f_locals.items())[:30] if not k.startswith('__')}
    step = {'line': frame.f_lineno, 'event': event, 'scope': frame.f_code.co_name, 'variables': variables, 'output': output.getvalue()}
    budget += len(json.dumps(step))
    steps.append(step)
    return trace
try:
    program = compile(source, '<student>', 'exec')
    sys.stdout = output
    sys.settrace(trace)
    exec(program, {'__name__': '__main__'})
except BaseException as exc:
    error = type(exc).__name__ + ': ' + str(exc)[:300]
finally:
    sys.settrace(None)
    sys.stdout = original_stdout
print(json.dumps({'steps': steps, 'error': error, 'truncated': truncated}, ensure_ascii=True))
`
}

export function parseCodeTrace(stdout: string): CodeTrace {
  const trace = JSON.parse(stdout)
  if (!Array.isArray(trace.steps) || trace.steps.some((s: TraceStep) => !Number.isInteger(s.line) || !s.variables || typeof s.output !== 'string')) {
    throw new Error('The runner returned an invalid trace.')
  }
  return trace
}
