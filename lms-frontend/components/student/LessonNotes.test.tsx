import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import LessonNotes from './LessonNotes'
import { api } from '@/lib/api'

jest.mock('@/lib/api', () => ({ api: { get: jest.fn(), patch: jest.fn() } }))
beforeEach(() => {
  jest.resetAllMocks()
  ;(api.get as jest.Mock).mockResolvedValue({ data: { note: 'Existing note', bookmarked: false } })
  ;(api.patch as jest.Mock).mockResolvedValue({ data: {} })
})

test('retains a failed draft and only marks it saved after a successful retry', async () => {
  ;(api.patch as jest.Mock).mockRejectedValueOnce(new Error('Offline'))
  render(<LessonNotes lessonId={10} />)
  fireEvent.change(await screen.findByLabelText('Private note for this lesson'), { target: { value: 'My draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Changes could not be saved')
  expect(screen.getByRole('textbox')).toHaveValue('My draft')
  fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled())
  expect(api.patch).toHaveBeenLastCalledWith('/learning-state/lessons/10', { note: 'My draft' })
})

test('preserves unsaved drafts across lesson navigation without showing them on another lesson', async () => {
  const { rerender } = render(<LessonNotes lessonId={10} />)
  fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Lesson ten draft' } })
  rerender(<LessonNotes lessonId={11} />)
  expect(await screen.findByRole('textbox')).toHaveValue('Existing note')
  rerender(<LessonNotes lessonId={10} />)
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('Lesson ten draft'))
})

test('bookmark updates do not submit or acknowledge an unsaved note', async () => {
  render(<LessonNotes lessonId={10} />)
  fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Unsaved note' } })
  fireEvent.click(screen.getByRole('button', { name: 'Bookmark lesson' }))
  expect(await screen.findByRole('button', { name: 'Remove bookmark' })).toHaveAttribute('aria-pressed', 'true')
  expect(api.patch).toHaveBeenCalledWith('/learning-state/lessons/10', { bookmarked: true })
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes')
})

test('an edit made during a save remains unsaved after the older save succeeds', async () => {
  let complete!: (value: unknown) => void
  ;(api.patch as jest.Mock).mockImplementation(() => new Promise(resolve => { complete = resolve }))
  render(<LessonNotes lessonId={10} />)
  fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'First draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Newer draft' } })
  await act(async () => complete({ data: {} }))
  expect(screen.getByRole('textbox')).toHaveValue('Newer draft')
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes')
})

test('failed reads require a successful retry before enabling editing', async () => {
  ;(api.get as jest.Mock).mockRejectedValueOnce(new Error('Offline'))
  render(<LessonNotes lessonId={10} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Retry loading notes' }))
  expect(await screen.findByRole('textbox')).toHaveValue('Existing note')
})
