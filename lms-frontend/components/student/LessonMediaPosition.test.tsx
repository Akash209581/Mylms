import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import LessonMediaPosition from './LessonMediaPosition'
import ResumableVideo from './ResumableVideo'
import { api } from '@/lib/api'
jest.mock('@/lib/api', () => ({ api: { get: jest.fn(), patch: jest.fn() } }))
beforeEach(() => {
  jest.resetAllMocks()
  ;(api.get as jest.Mock).mockResolvedValue({ data: { pdfPage: 4, videoSeconds: 32 } })
  ;(api.patch as jest.Mock).mockResolvedValue({ data: {} })
})
test('restores saved positions and sends only media fields', async () => {
  render(<LessonMediaPosition lessonId={10}>{(position, record) => <button onClick={() => record({ pdfPage: 5 }, true)}>Page {position.pdfPage}</button>}</LessonMediaPosition>)
  fireEvent.click(await screen.findByRole('button', { name: 'Page 4' }))
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/learning-state/lessons/10', { pdfPage: 5 }))
})
test('keeps content available after read failure without overwriting the unknown saved position', async () => {
  ;(api.get as jest.Mock).mockRejectedValue(new Error('offline'))
  render(<LessonMediaPosition lessonId={10}>{(position, record) => <button onClick={() => record({ pdfPage: 2 }, true)}>Page {position.pdfPage}</button>}</LessonMediaPosition>)
  fireEvent.click(await screen.findByRole('button', { name: 'Page 1' }))
  expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded')
  expect(api.patch).not.toHaveBeenCalled()
})
test('retries a failed position save', async () => {
  ;(api.patch as jest.Mock).mockRejectedValueOnce(new Error('offline'))
  render(<LessonMediaPosition lessonId={10}>{(_, record) => <button onClick={() => record({ videoSeconds: 90 }, true)}>Pause</button>}</LessonMediaPosition>)
  fireEvent.click(await screen.findByRole('button', { name: 'Pause' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Retry save' }))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  expect(api.patch).toHaveBeenCalledTimes(2)
})
test('flushes the original lesson position when leaving the lesson', async () => {
  const { unmount } = render(<LessonMediaPosition lessonId={10}>{(_, record) => <button onClick={() => record({ videoSeconds: 42 })}>Watch</button>}</LessonMediaPosition>)
  fireEvent.click(await screen.findByRole('button', { name: 'Watch' }))
  await act(async () => unmount())
  expect(api.patch).toHaveBeenCalledWith('/learning-state/lessons/10', { videoSeconds: 42 })
})
test('clamps video resume to the current media duration and saves pause position', () => {
  const onPosition = jest.fn()
  const { container } = render(<ResumableVideo src="/lesson.mp4" initialSeconds={500} onPosition={onPosition} />)
  const video = container.querySelector('video')!
  Object.defineProperty(video, 'duration', { value: 120 })
  fireEvent.loadedMetadata(video)
  expect(video.currentTime).toBe(120)
  video.currentTime = 30
  fireEvent.pause(video)
  expect(onPosition).toHaveBeenCalledWith(30, true)
})
