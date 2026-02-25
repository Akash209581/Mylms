'use client'

import { useState, useEffect, useCallback } from 'react'
import CourseCard from '@/components/CourseCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Course } from '@/lib/types'
import { Search, Filter } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const fetchCourses = useCallback(async () => {
    try {
      let url = '/api/courses?'
      if (selectedLevel) url += `level=${selectedLevel}&`
      if (selectedCategory) url += `category=${selectedCategory}&`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setCourses(data.courses)
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedLevel, selectedCategory])

  useEffect(() => {
    fetchCourses()
  }, [selectedLevel, selectedCategory, fetchCourses])

  const handleEnroll = async (courseId: string) => {
    // Enrollment functionality will be implemented in Phase 2
    console.log('Enroll in course:', courseId)
    alert('Enrollment feature coming soon in Phase 2!')
  }

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Explore Courses
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Discover and enroll in courses to enhance your skills
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4 animate-slide-up">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 transition-all duration-200"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">Filters:</span>
          </div>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-all duration-200"
          >
            <option value="">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-all duration-200"
          >
            <option value="">All Categories</option>
            <option value="Web Development">Web Development</option>
            <option value="Data Science">Data Science</option>
            <option value="Design">Design</option>
            <option value="Business">Business</option>
            <option value="Marketing">Marketing</option>
          </select>

          {(selectedLevel || selectedCategory) && (
            <button
              onClick={() => {
                setSelectedLevel('')
                setSelectedCategory('')
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard 
              key={course.id} 
              course={course} 
              onEnroll={handleEnroll}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
          <Search className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Courses Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  )
}
