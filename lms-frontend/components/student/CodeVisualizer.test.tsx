import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CodeVisualizer from './CodeVisualizer'
import { api } from '@/lib/api'

jest.mock('@/lib/api', () => ({ api: { post: jest.fn(), get: jest.fn() } }))
jest.mock('@/lib/code-trace', () => ({
  pythonTraceProgram: () => 'instrumented code',
  parseCodeTrace: JSON.parse,
}))
const trace = { steps: [
  { line: 1, event: 'line', scope: '<module>', variables: {}, output: '' },
  { line: 2, event: 'return', scope: '<module>', variables: { count: 3 }, output: '3\n' },
], error: '', truncated: false }
beforeEach(() => jest.clearAllMocks())

test('plays captured steps and clears stale results when code changes', async () => {
  ;(api.post as jest.Mock).mockResolvedValue({ data: { stdout: JSON.stringify(trace) } })
  const view = render(<CodeVisualizer code={'count = 3\nprint(count)'} language="python" stdin="" />)
  fireEvent.click(screen.getByText('Visualize my code'))
  expect(await screen.findByText('Step 1 / 2')).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Next step'))
  expect(screen.getByText('count')).toBeInTheDocument()
  expect(screen.getByText('Step 2 / 2')).toBeInTheDocument()
  view.rerender(<CodeVisualizer code="count = 4" language="python" stdin="" />)
  await waitFor(() => expect(screen.queryByText('Step 2 / 2')).not.toBeInTheDocument())
})

test('explains unsupported languages and runner failures', async () => {
  const view = render(<CodeVisualizer code="x" language="java" stdin="" />)
  expect(screen.getByText(/currently supports Python/)).toBeInTheDocument()
  expect(screen.queryByText('Visualize my code')).not.toBeInTheDocument()
  view.rerender(<CodeVisualizer code="x" language="python" stdin="" />)
  ;(api.post as jest.Mock).mockRejectedValue(new Error('Runner unavailable'))
  fireEvent.click(screen.getByText('Visualize my code'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Runner unavailable')
})
