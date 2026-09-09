import { render, screen, fireEvent } from '@testing-library/react'
import MyLearningPage from './page'

jest.mock('@/components/layout/StudentReferenceShell', () => () => null)
jest.mock('@/lib/useStudentLearning', () => ({
  ...jest.requireActual('@/lib/useStudentLearning'),
  useStudentLearning: () => ({ loading: false, error: '', reload: jest.fn(), courses: [
    { courseId: 1, title: 'Python basics', completedLessons: 0, totalLessons: 5, progressPercent: 0, nextLessonId: 20 },
    { courseId: 2, title: 'Web development', completedLessons: 3, totalLessons: 5, progressPercent: 60, nextLessonId: 32 },
    { courseId: 3, title: 'Design principles', completedLessons: 5, totalLessons: 5, progressPercent: 100 },
  ] }),
}))

it('filters enrolled courses by progress and lets the learner restore its saved visit', () => {
  render(<MyLearningPage />)
  fireEvent.click(screen.getByRole('button', { name: /In progress/ }))
  expect(screen.getByRole('link', { name: /Continue/ })).toHaveAttribute('href', '/dashboard/student/courses/2/learn')
  expect(screen.queryByRole('link', { name: 'Python basics' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Design principles' })).not.toBeInTheDocument()
})
it('searches the enrolled list and shows an honest empty result', () => {
  render(<MyLearningPage />)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'python' } })
  expect(screen.getByRole('link', { name: 'Python basics' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Web development' })).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'does not exist' } })
  expect(screen.getByText('No courses match these filters')).toBeInTheDocument()
})
