import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SavedCoursesPage from './page'
import { api } from '@/lib/api'
jest.mock('@/components/layout/StudentReferenceShell', () => () => null)
jest.mock('@/lib/api', () => ({ api: { get: jest.fn(), patch: jest.fn() } }))
beforeEach(() => {
  jest.resetAllMocks()
  ;(api.get as jest.Mock).mockResolvedValue({ data: [{ courseId: 1, saved: true, course: { id: 1, title: 'Python' } }] })
})
test('opens saved course details without fabricating enrollment and removes confirmed unsaves', async () => {
  ;(api.patch as jest.Mock).mockResolvedValue({ data: { saved: false } })
  render(<SavedCoursesPage />)
  expect(await screen.findByRole('link', { name: 'Python' })).toHaveAttribute('href', '/dashboard/student/courses/1')
  fireEvent.click(screen.getByRole('button', { name: 'Remove Python from saved courses' }))
  expect(await screen.findByText('No saved courses yet')).toBeInTheDocument()
  expect(api.patch).toHaveBeenCalledWith('/learning-state/courses/1', { saved: false })
})
test('failed unsaves keep the course visible for retry', async () => {
  ;(api.patch as jest.Mock).mockRejectedValue(new Error('Offline'))
  render(<SavedCoursesPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Remove Python from saved courses' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not be updated'))
  expect(screen.getByRole('link', { name: 'Python' })).toBeInTheDocument()
})
