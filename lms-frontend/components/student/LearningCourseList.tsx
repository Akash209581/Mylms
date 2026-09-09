import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { LearningCourse, learningHref, learningStatus } from '@/lib/useStudentLearning'

export default function LearningCourseList({ courses }: { courses: LearningCourse[] }) {
  return <ul className="portal-course-list">
    {courses.map(course => <li key={course.courseId}>
      <div className="portal-course-cover">{course.thumbnail ? <img src={course.thumbnail} alt="" loading="lazy" /> : <BookOpen aria-hidden="true" />}</div>
      <div className="portal-course-info">
        <small>{course.category || 'Course'}</small>
        <h3><Link href={`/dashboard/student/courses/${course.courseId}`}>{course.title}</Link></h3>
        <p>{course.completedLessons} of {course.totalLessons} lessons complete</p>
      </div>
      <div className="portal-course-progress"><progress aria-label={`${course.title} progress`} max={100} value={course.progressPercent} /><span>{course.progressPercent}%</span></div>
      <Link className="portal-link" href={learningHref(course)}>{learningStatus(course) === 'completed' ? 'Review' : learningStatus(course) === 'not-started' ? 'Start learning' : 'Continue'}<ArrowRight aria-hidden="true" size={16} /></Link>
    </li>)}
  </ul>
}
