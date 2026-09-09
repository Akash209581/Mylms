import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LearningPathPage from './page'
import { api } from '@/lib/api'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), useParams: () => ({ id: '1' }) }))
jest.mock('@/lib/api', () => ({ API_URL: 'http://localhost:3003', api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }))
jest.mock('@/components/student/LessonNotes', () => ({ __esModule: true, default: () => <div>Personal notes</div> }))
jest.mock('@/components/student/LessonBookmarks', () => ({ __esModule: true, default: () => <div>Bookmarks</div> }))
jest.mock('@/components/student/LessonMediaPosition', () => ({ __esModule: true, default: ({ children }: any) => children({ pdfPage: 1, videoSeconds: 0 }, jest.fn()) }))
jest.mock('@/components/student/LessonContentRenderer', () => ({ __esModule: true, default: ({ content }: any) => <div data-testid="lesson-content">{typeof content === 'string' ? content : JSON.stringify(content)}</div> }))
jest.mock('@/components/student/PdfSlideViewer', () => ({ __esModule: true, default: () => <div>PDF viewer</div> }))

const lesson = (id: number, title: string) => ({ id, title, chapterId: 2, content: `Content for ${title}`, published: true, type: 'text' })
const path = (lessons = [lesson(10, 'Introduction'), lesson(11, 'Practice')], completedLessonIds: number[] = []) => ({ course: { id: 1, title: 'Web development' }, isEnrolled: true, completedLessonIds, modules: [{ id: 1, title: 'Foundations', chapters: [{ id: 2, title: 'Getting started', lessons }] }] })

beforeEach(() => { jest.clearAllMocks(); window.history.replaceState({}, '', '/'); (api.post as jest.Mock).mockResolvedValue({ data: { success: true } }); (api.patch as jest.Mock).mockResolvedValue({ data: {} }) })

test('shows every lesson in the outline and navigates to its content', async () => {
  ;(api.get as jest.Mock).mockResolvedValue({ data: path() })
  render(<LearningPathPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Practice text/ }))
  expect(screen.getByTestId('lesson-content')).toHaveTextContent('Content for Practice')
})

test('empty chapters never become fake lessons', async () => {
  ;(api.get as jest.Mock).mockResolvedValue({ data: path([]) })
  render(<LearningPathPage />)
  expect(await screen.findByText('No lessons available yet')).toBeInTheDocument()
  expect(screen.queryByText('PDF viewer')).not.toBeInTheDocument()
})

test('resumes the first unfinished lesson and ignores stale completion IDs', async () => {
  ;(api.get as jest.Mock).mockResolvedValue({ data: path(undefined, [10, 999]) })
  render(<LearningPathPage />)
  expect(await screen.findByTestId('lesson-content')).toHaveTextContent('Content for Practice')
  expect(screen.getByText('50%')).toBeInTheDocument()
})

test('lesson deep links take precedence over resume progress', async () => {
  window.history.replaceState({}, '', '/?lessonId=10')
  ;(api.get as jest.Mock).mockResolvedValue({ data: path(undefined, [10]) })
  render(<LearningPathPage />)
  expect(await screen.findByTestId('lesson-content')).toHaveTextContent('Content for Introduction')
})

test('failed completion stays on the current lesson and displays a retry message', async () => {
  ;(api.get as jest.Mock).mockResolvedValue({ data: path() })
  ;(api.post as jest.Mock).mockRejectedValue(new Error('Network unavailable'))
  render(<LearningPathPage />)
  fireEvent.click(await screen.findByRole('button', { name: /mark.*complete/i }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Progress could not be saved')
  expect(screen.getByTestId('lesson-content')).toHaveTextContent('Content for Introduction')
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/student/lessons/10/complete'))
})

test('restores a saved lesson even when it is already completed and records the visit', async () => {
  ;(api.get as jest.Mock).mockImplementation((url: string) => Promise.resolve({ data: url.includes('learning-state') ? { lastLessonId: 10 } : path(undefined, [10]) }))
  render(<LearningPathPage />)
  expect(await screen.findByTestId('lesson-content')).toHaveTextContent('Content for Introduction')
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/learning-state/courses/1', { lastLessonId: 10 }))
})

test('explicit lesson links override a saved lesson', async () => {
  window.history.replaceState({}, '', '/?lessonId=11')
  ;(api.get as jest.Mock).mockImplementation((url: string) => Promise.resolve({ data: url.includes('learning-state') ? { lastLessonId: 10 } : path() }))
  render(<LearningPathPage />)
  expect(await screen.findByTestId('lesson-content')).toHaveTextContent('Content for Practice')
})

test('an unavailable learning-state API does not block lesson content', async () => {
  ;(api.get as jest.Mock).mockImplementation((url: string) => url.includes('learning-state') ? Promise.reject(new Error('Unavailable')) : Promise.resolve({ data: path(undefined, [10]) }))
  ;(api.patch as jest.Mock).mockRejectedValue(new Error('Unavailable'))
  render(<LearningPathPage />)
  expect(await screen.findByTestId('lesson-content')).toHaveTextContent('Content for Practice')
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('resume position could not be saved'))
})
