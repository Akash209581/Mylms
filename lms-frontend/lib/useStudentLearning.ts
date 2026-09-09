'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from './api'

export type LearningCourse = {
  courseId: number; title: string; thumbnail?: string; category?: string;
  completedLessons: number; totalLessons: number; progressPercent: number;
  nextLessonId?: number | null; nextLessonTitle?: string | null;
}
export function learningHref(course: LearningCourse) {
  // The learner resolves saved visits before falling back to the next unfinished lesson.
  return `/dashboard/student/courses/${course.courseId}/learn`
}
export function learningStatus(course: LearningCourse) {
  return course.totalLessons > 0 && course.completedLessons >= course.totalLessons ? 'completed' : course.completedLessons > 0 ? 'in-progress' : 'not-started'
}
export function useStudentLearning() {
  const router = useRouter()
  const [courses, setCourses] = useState<LearningCourse[]>([])
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [stats, setStats] = useState<{ streak: number; certificates: number } | null>(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const reload = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const profile = await api.get('/auth/me')
      if (profile.data.role !== 'STUDENT') { router.replace(`/dashboard/${profile.data.role.toLowerCase()}`); return }
      setUser(profile.data)
      const [details, statistics] = await Promise.all([api.get('/student/dashboard-details'), api.get('/student/stats')])
      setCourses(details.data.coursesProgress || [])
      setStats(statistics.data)
    } catch (failure: any) {
      if (failure.response?.status === 401) router.replace('/login')
      else setError('Your learning information could not be loaded. Please try again.')
    } finally { setLoading(false) }
  }, [router])
  useEffect(() => { void reload() }, [reload])
  return { courses, user, stats, loading, error, reload }
}
